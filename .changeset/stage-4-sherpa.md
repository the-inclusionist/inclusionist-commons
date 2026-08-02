---
"@jrocha-io/tts": minor
---

Stage 4: the SherpaEngine adapter (sherpa-onnx-wasm) implementing TtsEngine — Piper (medium/high) + Kokoro fp32, the neural offline fallback. The WASM runtime, model fetcher and audio player are injected as structural types (so @jrocha-io/tts stays dependency-free); voice-id parsing, HF fetch URLs, FS writes, VITS/Kokoro config, one-session-per-variant and sid routing are all unit-tested with fakes.
