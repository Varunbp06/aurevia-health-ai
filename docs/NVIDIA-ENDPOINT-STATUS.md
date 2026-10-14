# NVIDIA inference endpoint status

**Status: WORKING — verified end to end on production.**

## Verified evidence

Request:

```bash
curl -sS -N -X POST https://aureviahealth.vercel.app/api/nvidia-chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Reply with exactly: READY","history":[]}'
```

Response (streaming SSE, truncated):

```
data: {"choices":[{"index":0,"delta":{"content":"READ","role":"assistant"}}],...,"model":"nvidia/nemotron-3.5-lightning-30b-a3b"}
data: {"choices":[{"index":0,"delta":{"content":"Y","role":"assistant"}}],...}
data: {"choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":"stop"}],...}
data: [DONE]
```

The model returned the requested token, so the full path is proven:
browser → `/api/nvidia-chat` (Edge Function) → NVIDIA → streamed back to the
client. The provider credential stayed server-side throughout.

## What was actually wrong

A first attempt used the legacy model IDs
`nvidia/llama-3.3-nemotron-super-49b-v1`, `...-v1.5` and
`meta/llama-3.1-8b-instruct`. All three returned **HTTP 410 Gone**, which is why
the proxy was initially believed to be blocked at account level. The 410s were
model-specific: the retired Nemotron Super 49B v1 family is no longer served on
this endpoint.

Switching the default to `nvidia/nemotron-3.5-lightning-30b-a3b` resolved it
immediately. Do not reintroduce the legacy IDs.

## Allow-listed models

| Model | State |
| --- | --- |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | default — **verified working** |
| `nvidia/nemotron-3-ultra-550b-a55b` | allowed, not yet exercised |
| `meta/llama-3.1-8b-instruct` | allowed as a fallback; returned 410 in testing — treat as unreliable |

## Non-credential controls (verified on production)

| Check | Result |
| --- | --- |
| `GET /api/nvidia-chat` | `405 {"error":"Method not allowed"}` — not swallowed by the SPA rewrite |
| `POST` with `Origin: https://evil.example` | `403 {"error":"Origin not allowed"}` |
| `DELETE /api/nvidia-chat` | `405` |
| Provider key in deployed bundle | absent (`nvapi-`, `NVIDIA_API_KEY`, and the upstream URL all have zero matches) |
| Provider key in response body | absent |

## Deployment-scope note

`NVIDIA_API_KEY` is configured for the **Production** environment only. Preview
deployments therefore do not receive it and correctly answer
`503 {"error":"AI provider is not configured on this deployment."}`. Add the
variable to the Preview scope as well if preview builds should reach the
provider.
