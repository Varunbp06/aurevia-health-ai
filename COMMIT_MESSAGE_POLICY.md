# Commit-message policy

This repository does not permit automated Codebuff promotional footers or Codebuff
co-author trailers in commit messages.

Examples rejected by the repository hook and CI check include:

- `🤖 Generated with Codebuff`
- `Co-Authored-By: Codebuff <noreply@codebuff.com>`
- Case variations and equivalent Codebuff trailer lines containing `noreply@codebuff.com`

Use a meaningful commit message describing the change, without an AI-tool
promotional footer. This policy does not prohibit ordinary commit messages that
discuss the tool by name.

## Enable the local hook safely

The tracked hook lives at `.githooks/commit-msg`. GitHub Actions checks pushed and
proposed commit messages, but a tracked hook is not automatically active in an
existing clone.

In each local clone, inspect the current hook setup before enabling it:

```sh
git config --show-origin --get core.hooksPath
git status --short
```

Inspect active hooks in `.git/hooks` or the currently configured hooks directory.
Do not overwrite an existing hooks path or discard existing hook behaviour. If
hooks already exist, integrate this guard into the active `commit-msg` hook while
preserving its behaviour.

This repository already sets `core.hooksPath` to `.githooks`, so the tracked guard
is active once this file is present. Verify it with:

```sh
sh scripts/test-commit-message-policy.sh
```

The automated test script covers accepted and rejected examples.
