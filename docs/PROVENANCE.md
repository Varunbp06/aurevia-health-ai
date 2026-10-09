# Provenance and licence status — RESOLVED

**Status: RESOLVED (2026-10-14).** The upstream project's licence has been verified
against the upstream source itself, and this repository's licence, notices, and
manifests have been aligned to it. Nothing here is legal advice.

## Resolution

This repository **is** a derivative work of **AI-Healthcare-System**, whose actual
licence is **AGPL-3.0**. Aurevia Health AI is therefore distributed under
**AGPL-3.0**, and the upstream copyright and licence notices are preserved.

## Evidence

| Item | Finding |
| --- | --- |
| Upstream location | `https://gitlab.com/pavanbadempet/AI-Healthcare-System` — **GitLab**, not GitHub |
| Why the earlier GitHub check failed | `gh api repos/pavanbadempet/AI-Healthcare-System` returns 404 because the project is hosted on GitLab; the GitHub path never existed |
| Upstream `LICENSE` (fetched `/-/raw/main/LICENSE`) | Full **GNU AFFERO GENERAL PUBLIC LICENSE, Version 3** — 34,020 bytes, sha256 `d8a6cc31abc16b6748c7a21f21611f5a1ec33f67d22ca23d7da1c19b95496bee`, 0 occurrences of "MIT License" |
| Liveness | `git ls-remote --heads https://gitlab.com/pavanbadempet/AI-Healthcare-System.git` succeeds (`main`, `gh-pages`) |
| Independent corroboration | A capture taken 2026-10-09 (`_audit/upstream_agpl.txt`) is **byte-identical** to the licence fetched on 2026-10-14 (same sha256), so the licence has been stable |
| Derivation evidence in this repo | The tree was seeded from the upstream project; source headers/tooling reference the upstream author's machine path, and `.env.example` / `CHANGELOG.md` / `CITATION.cff` all describe the upstream origin |

## What changed

Commit `f31eda1` ("fix: restore AGPL-3.0 license and upstream attribution") already
contained the required restoration but lived only on a side branch. It has now been
applied to `main` and completed:

- `LICENSE` — full AGPL-3.0 text replacing the incorrect MIT grant.
- `NOTICE` — upstream attribution, upstream URL corrected to the verified **GitLab** location.
- `README.md` — header, licence badge, and attribution corrected to AGPL-3.0 / GitLab.
- `CHANGELOG.md` — licence history records the AGPL-3.0 position.
- `package.json` — `license` changed from `MIT` to `AGPL-3.0`.
- `CITATION.cff` — upstream `url` / `repository-code` corrected to GitLab.
- `.env.example` — header no longer claims the upstream licence is unverified.
- `docs/LEGAL_AND_LIABILITY.md` — licence references aligned.

## Obligations that now apply

AGPL-3.0 §13 requires that users interacting with the software over a network be
offered the corresponding source of the running version. The source is published at
`https://github.com/Varunbp06/aurevia-health-ai`, which satisfies this for the public
demo. Any future deployment that modifies the source must keep an equivalent source
offer available.

Modifications authored in this repository are © 2026 Varun B P. Copyright in the
upstream source remains with the upstream authors and is **not** transferred by
rebranding, added features, or changed user-facing copy.

## Related, already-corrected items

- The provider credential was moved server-side; see `docs/NVIDIA-ENDPOINT-STATUS.md`.
