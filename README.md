# inclusionist-commons

Shared, versioned TypeScript packages (`@jrocha-io/*`) reused across [The Inclusionist](https://github.com/jrocha-io/the-inclusionist),
the [TTS Lab](https://github.com/jrocha-io/tts-lab), and future projects. Published to **GitLab Package Registry**.

Decisions: `the-inclusionist` → ADR-0023 (labs are first-class apps) + ADR-0024 (multi-repo, versioned packages).

## Packages

| Package | Purpose | Status |
|---|---|---|
| [`@jrocha-io/tts`](packages/tts) | TTS engine **port** + adapters (Web Speech · eSpeak-NG · sherpa-onnx-wasm · Kokoro-WebGPU) + registry | Stage 0: port only |
| `@jrocha-io/audio` | `AudioPlayer` port + WebAudio impl | planned (Stage 2) |
| `@jrocha-io/logging` | `Logger` port + DOM/console impls | planned (Stage 2) |
| `@jrocha-io/model-fetch` | `ModelFetcher` DAO (fetch + Cache API + progress) | planned (Stage 2) |

## Develop

```bash
npm install
npm run build        # tsc per package
npm run typecheck
```

## Release (GitLab Package Registry)

```bash
npm run changeset    # describe the change + bump
npm run version      # apply version bumps + changelogs
npm run release      # build + changeset publish  (needs a GH Packages token; see below)
```

Publishing/installing `@jrocha-io/*` needs auth to GitLab Package Registry. In `~/.npmrc`:

```
//gitlab.com/api/v4/projects/85034729/packages/npm/:_authToken=YOUR_GITLAB_TOKEN
```

On Windows + Avast, run npm with `NODE_OPTIONS=--use-system-ca` and `UV_NATIVE_TLS=1` so the re-signed TLS validates.

License: GPL-3.0-or-later.
