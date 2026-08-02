---
"@jrocha-io/tts": minor
---

Stage 5: the KokoroWebGpuEngine adapter (Kokoro-82M via kokoro-js / onnxruntime-web, WebGPU or wasm). fp32/fp16/q8 × device set at construction; the kokoro-js loader + audio player are injected; English voices only (RTF benchmark; pt-BR g2p later). Tolerates both kokoro-js audio shapes. Unit-tested with fakes.
