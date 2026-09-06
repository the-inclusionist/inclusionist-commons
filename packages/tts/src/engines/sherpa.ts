// sherpa-onnx-wasm adapter — runs any VITS/Piper .onnx + the Kokoro multi-lang model in the browser
// (ADR-0022). The WASM runtime, the model fetcher and the audio player are all INJECTED (structural types,
// so @the-inclusionist/tts stays dependency-free); the app wires the concrete sherpa module + @the-inclusionist/model-fetch
// + @the-inclusionist/audio. Voice catalogs + config come from this package; the ~18MB engine assets live in the app.

import type { EngineMeta, Lang, SynthMetrics, SynthRequest, TtsEngine, Voice } from '../port.js';
import { langOf } from '../lang.js';
import { KOKORO, KOKORO_VOICES, PIPER_MODELS, hfUrl } from '../catalog.js';
import { computeRtf } from '../metrics.js';

/** One loaded sherpa TTS session. `generate` is synchronous (blocks while it synthesizes). */
export interface SherpaTtsSession {
  generate(opts: { text: string; sid: number; speed: number }): { samples: Float32Array; sampleRate: number };
  free?(): void;
}

/** The WASM runtime surface: write a model file into the Emscripten FS + build an OfflineTts from a config. */
export interface SherpaRuntime {
  writeFile(path: string, bytes: Uint8Array): void;
  createOfflineTts(config: unknown): SherpaTtsSession;
}

/** Minimal fetcher shape (satisfied by @the-inclusionist/model-fetch's HttpModelFetcher). */
export interface BytesFetcher {
  fetch(url: string, opts?: { force?: boolean; onProgress?: (frac: number) => void }): Promise<{ bytes: Uint8Array }>;
}

/** Minimal PCM player shape (satisfied by @the-inclusionist/audio's WebAudioPlayer). */
export interface PcmPlayer {
  warm?(): void;
  play(samples: Float32Array, sampleRate: number): void;
}

export interface SherpaEngineDeps {
  readonly runtime: SherpaRuntime;
  readonly fetcher: BytesFetcher;
  readonly player: PcmPlayer;
  /** numThreads for the OfflineTts config (multi-thread build uses >1; needs COOP/COEP). Default 1. */
  readonly numThreads?: number;
}

type SherpaVoiceRef =
  | { readonly kind: 'piper'; readonly modelId: string; readonly repo: string; readonly lang: Lang }
  | {
      readonly kind: 'kokoro';
      readonly name: string;
      readonly sid: number;
      readonly espeakLang: string;
      readonly variant: string;
      readonly lang: Lang;
    };

/** Parse a Section-2 voice id: a Piper model id, or "kokoro:<name>:<sid>:<espeakLang>:<variant>". */
export function parseSherpaVoiceId(voiceId: string): SherpaVoiceRef {
  if (voiceId.startsWith('kokoro:')) {
    const parts = voiceId.split(':');
    const espeakLang = parts[3] ?? 'en-us';
    return {
      kind: 'kokoro',
      name: parts[1] ?? '',
      sid: Number(parts[2] ?? 0),
      espeakLang,
      variant: parts[4] ?? 'fp32',
      lang: langOf(espeakLang),
    };
  }
  return { kind: 'piper', modelId: voiceId, repo: 'vits-piper-' + voiceId, lang: langOf(voiceId) };
}

/** One session per Piper model, and one per Kokoro variant+lang (the sid switches within a session). */
function sessionKey(ref: SherpaVoiceRef): string {
  return ref.kind === 'piper' ? 'piper:' + ref.modelId : 'kokoro:' + ref.variant + ':' + ref.espeakLang;
}

function vitsConfig(numThreads: number): unknown {
  return {
    offlineTtsModelConfig: {
      offlineTtsVitsModelConfig: {
        model: './model.onnx',
        lexicon: '',
        tokens: './tokens.txt',
        dataDir: './espeak-ng-data',
        noiseScale: 0.667,
        noiseScaleW: 0.8,
        lengthScale: 1.0,
      },
      numThreads,
      debug: 0,
      provider: 'cpu',
    },
    ruleFsts: '',
    ruleFars: '',
    maxNumSentences: 1,
  };
}

function kokoroConfig(lang: string, numThreads: number): unknown {
  return {
    offlineTtsModelConfig: {
      offlineTtsKokoroModelConfig: {
        model: './kokoro.onnx',
        voices: './kokoro-voices.bin',
        tokens: './kokoro-tokens.txt',
        dataDir: './espeak-ng-data',
        lexicon: '',
        lang,
      },
      numThreads,
      debug: 0,
      provider: 'cpu',
    },
    ruleFsts: '',
    ruleFars: '',
    maxNumSentences: 1,
  };
}

/**
 * The neural fallback: Piper (medium/high) + Kokoro fp32 via sherpa-onnx-wasm. Fetches each voice's files
 * once → FS → OfflineTts; synthesis is CPU (multi-thread optional). Metrics report RTF.
 */
export class SherpaEngine implements TtsEngine {
  readonly meta: EngineMeta = { id: 'sherpa', label: 'sherpa (Piper + Kokoro)', kind: 'neural' };
  readonly #runtime: SherpaRuntime;
  readonly #fetcher: BytesFetcher;
  readonly #player: PcmPlayer;
  readonly #numThreads: number;
  readonly #sessions = new Map<string, SherpaTtsSession>();

  constructor(deps: SherpaEngineDeps) {
    this.#runtime = deps.runtime;
    this.#fetcher = deps.fetcher;
    this.#player = deps.player;
    this.#numThreads = deps.numThreads ?? 1;
  }

  listVoices(lang?: Lang): readonly Voice[] {
    const out: Voice[] = [];
    for (const models of Object.values(PIPER_MODELS)) {
      for (const modelId of models) {
        const l = langOf(modelId);
        if (!lang || l === lang) out.push({ id: modelId, label: modelId, lang: l });
      }
    }
    for (const group of KOKORO_VOICES) {
      for (const v of group.voices) {
        if (!lang || v.lang === lang) {
          out.push({ id: `kokoro:${v.name}:${v.sid}:${v.espeakLang}:fp32`, label: v.name, lang: v.lang });
        }
      }
    }
    return out;
  }

  isLoaded(voiceId: string): boolean {
    return this.#sessions.has(sessionKey(parseSherpaVoiceId(voiceId)));
  }

  async load(voiceId: string, onProgress?: (frac: number) => void): Promise<void> {
    const ref = parseSherpaVoiceId(voiceId);
    const key = sessionKey(ref);
    if (this.#sessions.has(key)) return;

    if (ref.kind === 'piper') {
      const onnx = await this.#fetcher.fetch(hfUrl(ref.repo, ref.modelId + '.onnx'), onProgress ? { onProgress } : {});
      const tokens = await this.#fetcher.fetch(hfUrl(ref.repo, 'tokens.txt'));
      this.#runtime.writeFile('model.onnx', onnx.bytes);
      this.#runtime.writeFile('tokens.txt', tokens.bytes);
      this.#sessions.set(key, this.#runtime.createOfflineTts(vitsConfig(this.#numThreads)));
    } else {
      const variant = KOKORO[ref.variant];
      if (!variant) throw new Error(`Kokoro variant desconhecida: ${ref.variant}`);
      const model = await this.#fetcher.fetch(hfUrl(variant.repo, variant.file), onProgress ? { onProgress } : {});
      const voices = await this.#fetcher.fetch(hfUrl(variant.repo, 'voices.bin'));
      const tokens = await this.#fetcher.fetch(hfUrl(variant.repo, 'tokens.txt'));
      this.#runtime.writeFile('kokoro.onnx', model.bytes);
      this.#runtime.writeFile('kokoro-voices.bin', voices.bytes);
      this.#runtime.writeFile('kokoro-tokens.txt', tokens.bytes);
      this.#sessions.set(key, this.#runtime.createOfflineTts(kokoroConfig(ref.espeakLang, this.#numThreads)));
    }
  }

  async speak(req: SynthRequest): Promise<SynthMetrics> {
    if (!req.voiceId) throw new Error('sherpa exige voiceId');
    const ref = parseSherpaVoiceId(req.voiceId);
    const session = this.#sessions.get(sessionKey(ref));
    if (!session) throw new Error(`voz não carregada: ${req.voiceId}`);
    const sid = ref.kind === 'kokoro' ? ref.sid : 0;
    this.#player.warm?.();
    const t0 = nowMs();
    const audio = session.generate({ text: req.text, sid, speed: req.rate });
    const synthMs = nowMs() - t0;
    const audioSec = audio.samples.length / audio.sampleRate;
    this.#player.play(audio.samples, audio.sampleRate);
    return { synthMs, audioSec, rtf: computeRtf(synthMs, audioSec) };
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
