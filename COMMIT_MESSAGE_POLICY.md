# Commit-message policy

This repository does not permit automated Codebuff promotional footers or Codebuff co-author trailers in commit messages.

Examples rejected by the repository hook and CI check include:
- `🤖 Generated with Codebuff`
- `Co-Authored-By: Codebuff <noreply@codebuff.com>`
- Case variations and equivalent Codebuff trailer lines containing `noreply@codebuff.com`

Use a meaningful commit message that describes the change, without an AI-tool promotional footer. This policy does not prohibit legitimate commit messages that simply discuss the tool by name.

## Enable the local hook safely

The tracked hook lives at `.githooks/commit-msg`. The GitHub Actions workflow checks pushed commits and pull-request commits, but a tracked hook is not automatically active in an existing clone.

In each local clone, inspect the current hook setup before enabling it:

```sh
git config --show-origin --get core.hooksPath
git status --short
```

Also inspect active hooks in `.git/hooks` (or the currently configured hooks directory). Do **not** overwrite an existing hooks path or discard existing hook behavior. If a custom hooks path or active hooks already exist, integrate this guard into the existing `commit-msg` hook or chain the hooks while preserving all existing behavior.

Only when doing so will not displace existing hooks, enable the repository hook with:

```sh
git config --local core.hooksPath .githooks
sh scripts/test-commit-message-policy.sh
```

The hook deliberately rejects only Codebuff signature/trailer patterns, not ordinary commit messages that mention the tool. The automated test script covers accepted and rejected examples.
