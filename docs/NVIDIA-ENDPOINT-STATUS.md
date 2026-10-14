# NVIDIA inference endpoint status

**Status: BLOCKED (external, account-level).** Not a code defect, and not
something this repository can fix.

## Symptom

`POST https://integrate.api.nvidia.com/v1/chat/completions` returns
**HTTP 410 Gone** for every model, through the `/api/nvidia-chat` proxy:

```
{"error":"AI provider rejected the request.","upstreamStatus":410}
```

Verified on production against three different model IDs
(`meta/llama-3.1-8b-instruct`, `nvidia/llama-3.3-nemotron-super-49b-v1`,
`nvidia/llama-3.3-nemotron-super-49b-v1.5`) — all returned 410, which rules out
a single bad model ID and points at the endpoint/account rather than the request.

## Cause

NVIDIA's developer forums document this exact behaviour: the public inference
endpoint returns `410 Gone` for accounts that do not have **Public API
Endpoints** enabled for their NVIDIA organisation. The error body is often
empty, and it is returned regardless of which model is requested.

References:

- https://forums.developer.nvidia.com/t/request-enable-public-api-endpoints-for-personal-account-http-410-error/384417
- https://forums.developer.nvidia.com/t/request-to-enable-public-api-endpoints-permission-for-my-personal-organization-http-410/379922

## Resolution (requires the account owner)

1. Sign in to <https://build.nvidia.com> with the account behind the
   `NVIDIA_API_KEY` configured in this Vercel project.
2. Enable **Public API Endpoints** for that organisation/personal account.
3. Re-run the smoke check:

   ```bash
   curl -sS -X POST https://aureviahealth.vercel.app/api/nvidia-chat \
     -H 'Content-Type: application/json' \
     -d '{"message":"Reply with exactly: READY","history":[]}'
   ```

   A working account streams `data: {"choices":[{"delta":...}]}` frames. A `410`
   in the JSON body means the permission is still not enabled.

## Why the application is nevertheless safe and honest

- The provider credential is **server-only** (`NVIDIA_API_KEY`, a Vercel
  sensitive variable read exclusively by the `/api/nvidia-chat` Edge Function).
  It is not present in the client bundle, source maps, or any response body.
- When the provider is unavailable the proxy returns a generic, honest error.
  It never fabricates a model reply and never falls back to exposing a key.
- Chat remains usable without this provider via the in-browser WebGPU engine
  (Model Manager → Browser AI), which needs no credential at all.

## Unverified

The model IDs allow-listed in `api/nvidia-chat.ts` follow NVIDIA's current
hosted catalog but have **not** been exercised end to end, because the account
returns 410 before a model is ever reached. Re-test after the permission is
enabled.
