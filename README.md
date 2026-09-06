# inclusionist-commons

Shared, versioned TypeScript packages reused across [the engine](https://github.com/the-inclusionist/the-inclusionist-engine),
[the lab](https://github.com/the-inclusionist/inclusionist-lab) and future projects.

> ⚠️ **NOTHING HERE HAS EVER BEEN PUBLISHED.** Measured 2026-09-06: the GitLab registry this
> repository used to point at holds **zero** packages, and npmjs answers 404 for every one of the
> four. The `.npmrc` that redirected the scope was removed for that reason — it aimed at an empty
> registry, and the registry decision has since changed twice.
>
>
> **Scope and licence are now the ones the records chose.** The four packages here are
> `@the-inclusionist/*` (**ADR-0071**) and the licence is **AGPL-3.0-or-later** (**ADR-0064**) —
> which is the licence this argument was written for: under GPL a vendor could host these as a
> service and owe the source to nobody, and AGPL §13 closes exactly that.

Decisions: `the-inclusionist` → ADR-0023 (labs are first-class apps) + ADR-0024 (multi-repo, versioned packages).

## Packages

| Package | Purpose | Status |
|---|---|---|
| [`@the-inclusionist/tts`](packages/tts) | TTS engine **port** + adapters (Web Speech · eSpeak-NG · sherpa-onnx-wasm · Kokoro-WebGPU) + registry | Stage 0: port only |
| `@the-inclusionist/audio` | `AudioPlayer` port + WebAudio impl | planned (Stage 2) |
| `@the-inclusionist/logging` | `Logger` port + DOM/console impls | planned (Stage 2) |
| `@the-inclusionist/model-fetch` | `ModelFetcher` DAO (fetch + Cache API + progress) | planned (Stage 2) |

## Develop

```bash
npm install
npm run build        # tsc per package
npm run typecheck
```

## Release

```bash
npm run changeset    # describe the change + bump
npm run version      # apply version bumps + changelogs
npm run release      # build + changeset publish
```

⚠️ **The publish target is NOT settled here.** **ADR-0072** chose **public npmjs** as the registry, for a
measured reason: on GitHub Packages even *installing* a public package needs a token, and a volunteer whose
first `npm install` returns `401` is a volunteer who leaves. The scope this repository publishes under is
still the old one, so the first release waits on the scope decision above.

The previous instructions here told the reader to put a `_authToken` for GitLab in their `~/.npmrc`. They
were removed rather than corrected: that registry holds nothing, and a token instruction that points nowhere
is worse than no instruction.

On Windows + Avast, run npm with `NODE_OPTIONS=--use-system-ca` and `UV_NATIVE_TLS=1` so the re-signed TLS validates.

License: AGPL-3.0-or-later.
