// Kokoro-82M via onnxruntime-web (WebGPU/wasm) through kokoro-js — the fast neural path. The kokoro-js
// loader + the audio player are INJECTED (structural types → @jrocha-io/tts stays dependency-free); the app
// supplies the concrete kokoro-js. English voices only, on purpose: this measures RTF (language doesn't
// change the speed; pt-BR g2p is a later step). fp32/fp16/q8 × webgpu/wasm are set at construction.

import type { EngineMeta, Lang, SynthMetrics, SynthRequest, TtsEngine, Voice } from '../port.js';
import { computeRtf } from '../metrics.js';
import type { PcmPlayer } from './sherpa.js';

/** A loaded kokoro-js TTS. `generate` returns Float32 PCM (shape varies across versions — handled below). */
export interface KokoroTts {
  generate(
    text: string,
    opts: { voice: string },
  ): Promise<{
    audio?: Float32Array | { audio?: Float32Array };
    data?: Float32Array;
    sampling_rate?: number;
    sampleRate?: number;
  }>;
}

export type KokoroDtype = 'fp32' | 'fp16' | 'q8';
export type KokoroDevice = 'webgpu' | 'wasm';

export interface KokoroWebGpuEngineDeps {
  /** Loads a KokoroTts for the given dtype/device (wraps kokoro-js `KokoroTTS.from_pretrained`). */
  readonly loadTts: (opts: { dtype: KokoroDtype; device: KokoroDevice }) => Promise<KokoroTts>;
  readonly player: PcmPlayer;
  readonly dtype?: KokoroDtype;
  readonly device?: KokoroDevice;
}

/** English voices for the RTF benchmark. */
const EN_VOICES: readonly Voice[] = [
  { id: 'af_heart', label: 'af_heart (F)', lang: 'en' },
  { id: 'am_adam', label: 'am_adam (M)', lang: 'en' },
  { id: 'af_bella', label: 'af_bella (F)', lang: 'en' },
];

export class KokoroWebGpuEngine implements TtsEngine {
  readonly meta: EngineMeta = { id: 'kokoro-webgpu', label: 'Kokoro (WebGPU)', kind: 'neural' };
  readonly #deps: KokoroWebGpuEngineDeps;
  readonly #dtype: KokoroDtype;
  readonly #device: KokoroDevice;
  #tts: KokoroTts | null = null;

  constructor(deps: KokoroWebGpuEngineDeps) {
    this.#deps = deps;
    this.#dtype = deps.dtype ?? 'fp32';
    this.#device = deps.device ?? 'webgpu';
  }

  listVoices(lang?: Lang): readonly Voice[] {
    return lang && lang !== 'en' ? [] : EN_VOICES;
  }

  isLoaded(): boolean {
    return this.#tts !== null;
  }

  /** Loads the model once (voiceId is a generate-time param, not a separate download). */
  async load(): Promise<void> {
    if (!this.#tts) this.#tts = await this.#deps.loadTts({ dtype: this.#dtype, device: this.#device });
  }

  async speak(req: SynthRequest): Promise<SynthMetrics> {
    if (!this.#tts) throw new Error('modelo não carregado');
    this.#deps.player.warm?.();
    const t0 = nowMs();
    const audio = await this.#tts.generate(req.text, { voice: req.voiceId ?? 'af_heart' });
    const synthMs = nowMs() - t0;
    const samples = extractSamples(audio);
    const rate = audio.sampling_rate ?? audio.sampleRate ?? 24000;
    const audioSec = samples.length / rate;
    this.#deps.player.play(samples, rate);
    return { synthMs, audioSec, rtf: computeRtf(synthMs, audioSec) };
  }
}

/** kokoro-js has returned the PCM as `.audio` (Float32Array) or a RawAudio whose `.audio` is the array. */
function extractSamples(audio: { audio?: Float32Array | { audio?: Float32Array }; data?: Float32Array }): Float32Array {
  const a = audio.audio;
  if (a instanceof Float32Array) return a;
  if (a && a.audio instanceof Float32Array) return a.audio;
  if (audio.data instanceof Float32Array) return audio.data;
  throw new Error('kokoro-js: formato de áudio inesperado');
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
