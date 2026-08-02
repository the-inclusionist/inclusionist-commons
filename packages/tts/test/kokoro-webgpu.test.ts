import { describe, it, expect } from 'vitest';
import { KokoroWebGpuEngine, type KokoroTts, type KokoroWebGpuEngineDeps } from '../src/engines/kokoro-webgpu.js';
import type { PcmPlayer } from '../src/engines/sherpa.js';

function fakes(generate?: KokoroTts['generate']) {
  const loads: { dtype: string; device: string }[] = [];
  const played: { len: number; rate: number }[] = [];
  const gen =
    generate ??
    ((_t: string, _o: { voice: string }) => Promise.resolve({ audio: new Float32Array(12000), sampling_rate: 24000 }));
  const player: PcmPlayer = { warm: () => {}, play: (s, rate) => played.push({ len: s.length, rate }) };
  const deps: KokoroWebGpuEngineDeps = {
    loadTts: (o) => {
      loads.push(o);
      return Promise.resolve({ generate: gen });
    },
    player,
  };
  return { deps, loads, played };
}

describe('KokoroWebGpuEngine', () => {
  it('is a neural engine listing only English voices', () => {
    const { deps } = fakes();
    const e = new KokoroWebGpuEngine(deps);
    expect(e.meta.kind).toBe('neural');
    expect(e.listVoices('en').map((v) => v.id)).toContain('af_heart');
    expect(e.listVoices('pt')).toEqual([]);
  });

  it('loads the model once with the configured dtype/device', async () => {
    const { deps, loads } = fakes();
    const e = new KokoroWebGpuEngine({ ...deps, dtype: 'fp16', device: 'wasm' });
    expect(e.isLoaded()).toBe(false);
    await e.load();
    await e.load(); // idempotent
    expect(loads).toEqual([{ dtype: 'fp16', device: 'wasm' }]);
    expect(e.isLoaded()).toBe(true);
  });

  it('defaults to fp32 + webgpu', async () => {
    const { deps, loads } = fakes();
    await new KokoroWebGpuEngine(deps).load();
    expect(loads[0]).toEqual({ dtype: 'fp32', device: 'webgpu' });
  });

  it('speaks: generates with the voice, plays the PCM, returns RTF', async () => {
    const { deps, played } = fakes();
    const e = new KokoroWebGpuEngine(deps);
    await e.load();
    const m = await e.speak({ text: 'the cat', lang: 'en', voiceId: 'am_adam', rate: 1 });
    expect(played[0]).toEqual({ len: 12000, rate: 24000 });
    expect(m.audioSec).toBeCloseTo(0.5); // 12000 / 24000
    expect(typeof m.rtf).toBe('number');
  });

  it('extracts samples from a RawAudio-shaped result', async () => {
    const gen = () => Promise.resolve({ audio: { audio: new Float32Array(6000) }, sampling_rate: 24000 });
    const { deps, played } = fakes(gen);
    const e = new KokoroWebGpuEngine(deps);
    await e.load();
    await e.speak({ text: 'x', lang: 'en', rate: 1 });
    expect(played[0]?.len).toBe(6000);
  });

  it('throws speaking before load', async () => {
    const { deps } = fakes();
    await expect(new KokoroWebGpuEngine(deps).speak({ text: 'x', lang: 'en', rate: 1 })).rejects.toThrow('não carregado');
  });
});
