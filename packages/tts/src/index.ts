// @jrocha-io/tts — public surface.
// Stage 1 ships the PORT + the pure DOMAIN (voice catalogs, metrics, cache parse, engine params).
// Adapters — WebSpeech, eSpeak-NG, sherpa-onnx-wasm, Kokoro-WebGPU — land in later stages (see the
// migration plan in the-inclusionist: docs/5-Refactoring/plano-tts-lab-modularizacao.md).

export type { Lang, Voice, SynthRequest, SynthMetrics, EngineKind, EngineMeta, TtsEngine } from './port.js';
export { langOf, BCP47 } from './lang.js';
export {
  HF_BASE,
  PIPER_MODELS,
  KOKORO,
  KOKORO_VOICES,
  isHigh,
  groupPiperByLocale,
  hfUrl,
} from './catalog.js';
export type { PiperOption, PiperGroup, KokoroVariant, KokoroVoice } from './catalog.js';
export { computeRtf } from './metrics.js';
export { parseDownloadedRepos } from './cache.js';
export {
  ENGINE_MULTI,
  ENGINE_SINGLE,
  engineParamsFor,
  isMultiThread,
  parseEngineParams,
} from './engine-params.js';
export type { EngineParams } from './engine-params.js';
export { WebSpeechEngine, platformSpeechApi } from './engines/web-speech.js';
export type { SpeechApi } from './engines/web-speech.js';
export { MeSpeakEngine } from './engines/mespeak.js';
export type { MeSpeakApi, MeSpeakVoice, MeSpeakEngineDeps } from './engines/mespeak.js';
export { SherpaEngine, parseSherpaVoiceId } from './engines/sherpa.js';
export type {
  SherpaEngineDeps,
  SherpaRuntime,
  SherpaTtsSession,
  BytesFetcher,
  PcmPlayer,
} from './engines/sherpa.js';
export { KokoroWebGpuEngine } from './engines/kokoro-webgpu.js';
export type {
  KokoroWebGpuEngineDeps,
  KokoroTts,
  KokoroDtype,
  KokoroDevice,
} from './engines/kokoro-webgpu.js';

/** Package version marker (bumped by Changesets on release). */
export const VERSION = '0.5.0';
