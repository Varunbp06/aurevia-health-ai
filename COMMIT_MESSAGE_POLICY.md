# Commit Message Policy

## Prohibited Signatures

The following commit message patterns are **rejected**:

1. Any message containing `Generated with Codebuff` (with or without emoji variant)
2. Any `Co-authored-by` trailer naming `Codebuff` or `noreply@codebuff`

## Rationale

Automated footer lines added by tools do not describe the actual change and
create noise in the project history. Human-authored messages are required.

## Enforcement

- Local: `.githooks/commit-msg` — runs on every `git commit`
- CI: `.github/workflows/commit-message-policy.yml` — runs on every PR
- Valid messages (including those that merely discuss Codebuff) are allowed

## Legitimate Uses

You may write about Codebuff in the body of a commit message if it
describes an actual discussion or decision.
