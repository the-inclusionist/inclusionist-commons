---
"@the-inclusionist/tts": minor
---

Stage 3b: the MeSpeakEngine adapter (eSpeak-NG WASM, zero-network fallback) implementing the TtsEngine port. The meSpeak API + config + per-language voices are injected (no CDN, no baked assets), so it is fully unit-tested off-browser and the heavy WASM/voice data stays in the consuming app.
