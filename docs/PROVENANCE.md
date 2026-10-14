# Provenance and licence status — ACTION REQUIRED

**Status: UNRESOLVED. Deliberately left unchanged.** This repository contains a
contradiction about its own licensing that only the copyright owner can settle.
Nothing here should be read as legal advice.

## The contradiction

| Source | Says |
| --- | --- |
| `LICENSE` | MIT, Copyright (c) 2026 Varun B P |
| `package.json` (`license`) | MIT |
| `.env.example` (header) | "Fork of AI Healthcare System • **AGPL-3.0** • Original LICENSE preserved" |
| `CHANGELOG.md` | Repeatedly records "Changed from **AGPL-3.0** to MIT License" |
| `CITATION.cff` | Points at `github.com/pavanbadempet/AI-Healthcare-System` |
| Git branches `audit/restore-agpl-and-attribution`, `audit/final-tidy`, `backup/pre-codebuff` | Contain commit `f31eda1` ("fix: restore AGPL-3.0 license and upstream attribution"), which is **not** an ancestor of `main` |

Additionally, the repository tracks **150 files under `.agents/`** whose contents
reference the upstream author's machine path
(`c:\Users\pavan\...\GitHub\AI-Healthcare-System`). That is evidence the tree was
seeded from that project, though those particular files are tooling notes rather
than application code.

## Why this was not "fixed" during the audit

The claim that an AGPL-3.0 upstream was relicensed to MIT would be a real licence
violation — AGPL-3.0 does not permit relicensing a derivative work as MIT. But it
could not be verified either way:

- `gh api repos/pavanbadempet/AI-Healthcare-System` returns **404 Not Found**, so
  the upstream licence cannot be read. The upstream may be deleted, renamed, or
  private.
- The local copy at `AI-Healthcare-System-main/LICENSE` reads **MIT, Copyright (c)
  2026 Varun B P**, which contradicts the AGPL claim.
- A prior audit commit (`f31eda1`) restored AGPL-3.0 with the rationale that the
  upstream is AGPL, but it lives only on side branches and was never merged.

Relicensing in either direction on this evidence would risk making the position
worse. MIT is therefore retained and the question is flagged.

## What the owner should do

1. Determine the upstream's actual licence — check the source you originally
   obtained it from, since the GitHub path above 404s.
2. If any part of this repository is genuinely derived from AGPL-3.0 code, the
   combined work must be distributed under AGPL-3.0. Commit `f31eda1` already
   contains the full restored AGPL text, a `NOTICE`, and the README/CHANGELOG
   corrections; review and merge that work rather than recreating it.
3. If the upstream is in fact MIT (as the local copy suggests), correct the
   `.env.example` header and `CHANGELOG.md` so they no longer assert an AGPL
   origin, and keep the MIT `LICENSE`.
4. Whichever way it resolves, update `.env.example`, `CHANGELOG.md`, `README.md`
   and `package.json` together so the four stay consistent.

## Related, already-corrected items

- The provider credential was moved server-side; see `docs/NVIDIA-ENDPOINT-STATUS.md`.
