import { describe, it, expect } from 'vitest';
import { SherpaEngine, parseSherpaVoiceId, type SherpaRuntime, type BytesFetcher, type PcmPlayer } from '../src/engines/sherpa.js';

function fakes() {
  const writes: { path: string; len: number }[] = [];
  const created: unknown[] = [];
  const generated: { text: string; sid: number; speed: number }[] = [];
  const played: { len: number; rate: number }[] = [];
  const fetched: string[] = [];

  const runtime: SherpaRuntime = {
    writeFile: (path, bytes) => writes.push({ path, len: bytes.length }),
    createOfflineTts: (config) => {
      created.push(config);
      return {
        generate: (opts) => {
          generated.push(opts);
          return { samples: new Float32Array(24000), sampleRate: 24000 }; // 1s of audio
        },
      };
    },
  };
  const fetcher: BytesFetcher = {
    fetch: (url) => {
      fetched.push(url);
      return Promise.resolve({ bytes: new Uint8Array([1, 2, 3]) });
    },
  };
  const player: PcmPlayer = { play: (s, rate) => played.push({ len: s.length, rate }) };

  return { runtime, fetcher, player, writes, created, generated, played, fetched };
}

describe('parseSherpaVoiceId', () => {
  it('parses a Piper model id', () => {
    expect(parseSherpaVoiceId('pt_BR-faber-medium')).toEqual({
      kind: 'piper',
      modelId: 'pt_BR-faber-medium',
      repo: 'vits-piper-pt_BR-faber-medium',
      lang: 'pt',
    });
  });
  it('parses a Kokoro voice id', () => {
    expect(parseSherpaVoiceId('kokoro:pf_dora:42:pt-br:fp32')).toEqual({
      kind: 'kokoro',
      name: 'pf_dora',
      sid: 42,
      espeakLang: 'pt-br',
      variant: 'fp32',
      lang: 'pt',
    });
  });
});

describe('SherpaEngine', () => {
  it('is a neural engine listing Piper + Kokoro voices', () => {
    const f = fakes();
    const e = new SherpaEngine(f);
    expect(e.meta.kind).toBe('neural');
    const pt = e.listVoices('pt');
    expect(pt.some((v) => v.id === 'pt_BR-faber-medium')).toBe(true);
    expect(pt.some((v) => v.id === 'kokoro:pf_dora:42:pt-br:fp32')).toBe(true);
    expect(pt.every((v) => v.lang === 'pt')).toBe(true);
  });

  it('loads a Piper voice: fetches onnx+tokens, writes FS, creates a session', async () => {
    const f = fakes();
    const e = new SherpaEngine(f);
    expect(e.isLoaded('pt_BR-faber-medium')).toBe(false);
    await e.load('pt_BR-faber-medium');
    expect(f.fetched).toEqual([
      'https://huggingface.co/csukuangfj/vits-piper-pt_BR-faber-medium/resolve/main/pt_BR-faber-medium.onnx',
      'https://huggingface.co/csukuangfj/vits-piper-pt_BR-faber-medium/resolve/main/tokens.txt',
    ]);
    expect(f.writes.map((w) => w.path)).toEqual(['model.onnx', 'tokens.txt']);
    expect(e.isLoaded('pt_BR-faber-medium')).toBe(true);
  });

  it('loads a Kokoro voice: fetches model+voices+tokens', async () => {
    const f = fakes();
    const e = new SherpaEngine(f);
    await e.load('kokoro:pf_dora:42:pt-br:fp32');
    expect(f.fetched).toEqual([
      'https://huggingface.co/csukuangfj/kokoro-multi-lang-v1_0/resolve/main/model.onnx',
      'https://huggingface.co/csukuangfj/kokoro-multi-lang-v1_0/resolve/main/voices.bin',
      'https://huggingface.co/csukuangfj/kokoro-multi-lang-v1_0/resolve/main/tokens.txt',
    ]);
    expect(f.writes.map((w) => w.path)).toEqual(['kokoro.onnx', 'kokoro-voices.bin', 'kokoro-tokens.txt']);
  });

  it('shares one session across Kokoro voices of the same variant+lang (sid switches)', async () => {
    const f = fakes();
    const e = new SherpaEngine(f);
    await e.load('kokoro:pf_dora:42:pt-br:fp32');
    await e.load('kokoro:pm_alex:43:pt-br:fp32'); // same variant+lang → no new session/fetch
    expect(f.created).toHaveLength(1);
    expect(e.isLoaded('kokoro:pm_alex:43:pt-br:fp32')).toBe(true);
  });

  it('speaks: generates with the right sid, plays the PCM, returns RTF', async () => {
    const f = fakes();
    const e = new SherpaEngine(f);
    await e.load('kokoro:pf_dora:42:pt-br:fp32');
    const m = await e.speak({ text: 'olá', lang: 'pt', voiceId: 'kokoro:pf_dora:42:pt-br:fp32', rate: 0.9 });
    expect(f.generated[0]).toEqual({ text: 'olá', sid: 42, speed: 0.9 });
    expect(f.played[0]).toEqual({ len: 24000, rate: 24000 });
    expect(m.audioSec).toBeCloseTo(1);
    expect(typeof m.rtf).toBe('number');
  });

  it('Piper speaks with sid 0', async () => {
    const f = fakes();
    const e = new SherpaEngine(f);
    await e.load('pt_BR-faber-medium');
    await e.speak({ text: 'oi', lang: 'pt', voiceId: 'pt_BR-faber-medium', rate: 1 });
    expect(f.generated[0]?.sid).toBe(0);
  });

  it('throws speaking an unloaded voice', async () => {
    const f = fakes();
    const e = new SherpaEngine(f);
    await expect(e.speak({ text: 'x', lang: 'pt', voiceId: 'pt_BR-faber-medium', rate: 1 })).rejects.toThrow('não carregada');
  });
});
