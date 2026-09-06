---
"@the-inclusionist/audio": minor
"@the-inclusionist/logging": minor
"@the-inclusionist/model-fetch": minor
"@the-inclusionist/tts": patch
---

Stage 2: infra packages.

- `@the-inclusionist/audio`: `AudioPlayer` port + `WebAudioPlayer` (single persistent AudioContext) + PCM normalization (peak/gain, Int16→Float32).
- `@the-inclusionist/logging`: `Logger` port + Console/Dom/Multi sinks + `mirrorConsole` (captures the sherpa `exit(-1)` reason).
- `@the-inclusionist/model-fetch`: `ModelFetcher` DAO — fetch + Cache API + streaming progress + first-download timestamp, all deps injectable.

`@the-inclusionist/tts`: moved `peakOf`/`gainFromPeak` to `@the-inclusionist/audio` (their natural home). Pre-publish, no consumers.
