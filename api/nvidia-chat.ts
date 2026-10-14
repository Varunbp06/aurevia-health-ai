/**
 * Aurevia Health AI — server-side AI chat proxy (Vercel Edge Function).
 *
 * Why this exists
 * ---------------
 * The browser must never hold a provider API key. Values exposed through Vite
 * (`VITE_*`) or Next-style public prefixes are inlined into the client bundle at
 * build time and are readable by anyone who opens devtools.
 *
 * This function is the only place that reads the provider credential. It reads
 * NVIDIA_API_KEY — a server-only, sensitive variable configured in the Vercel
 * project environment — and never returns it to the caller.
 *
 * Contract:
 *   POST /api/nvidia-chat
 *   body: { message: string, history?: {role,content}[], model?: string }
 *   -> 200 text/event-stream (OpenAI-compatible SSE, passed through upstream)
 *   -> non-2xx application/json { error: string } (no upstream detail leaked)
 */
export const config = { runtime: 'edge' };

// Ambient declaration so this file type-checks standalone. Vercel's Edge
// runtime provides `process.env` for environment variables.
declare const process: { env: Record<string, string | undefined> };

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Models this deployment is provisioned for. Callers may request any of these;
// anything else falls back to DEFAULT_MODEL, so the function cannot be used as
// an open gateway to arbitrary upstream models.
//
// DEFAULT_MODEL is verified streaming in production. The legacy
// nvidia/llama-3.3-nemotron-super-49b-v1 ids return HTTP 410 Gone from this
// endpoint, so they must not be reintroduced. See docs/NVIDIA-ENDPOINT-STATUS.md.
const DEFAULT_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const ALLOWED_MODELS = new Set<string>([
  DEFAULT_MODEL,
  'nvidia/nemotron-3-ultra-550b-a55b',
  'meta/llama-3.1-8b-instruct',
]);

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 24;
const MAX_HISTORY_MESSAGE_CHARS = 4000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_OUTPUT_TOKENS = 1024;
const UPSTREAM_TIMEOUT_MS = 60_000;

// Best-effort per-instance throttle. Edge instances are ephemeral and not
// shared, so this dampens accidental loops rather than stopping a determined
// abuser. Durable limits belong in front of the function (Vercel WAF/limiter).
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

function isThrottled(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

/**
 * Origin allow-list. A same-origin browser request sends the app's own host as
 * Origin, so production aliases and local development are accepted and anything
 * else is rejected. Header spoofing is possible, so this is one layer of
 * defence-in-depth, not the only control.
 */
function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser caller (e.g. curl); throttled separately
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === 'localhost' || host === '127.0.0.1') return true;
  const selfHost = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  if (host === selfHost) return true;
  // Vercel preview deployments of this project, plus the known public aliases.
  if (host.endsWith('.vercel.app') && host.startsWith('aurevia')) return true;
  return false;
}

interface ChatBody {
  message?: unknown;
  history?: unknown;
  model?: unknown;
}

function sanitizeHistory(raw: unknown): { role: string; content: string }[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: { role: string; content: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as Record<string, unknown>).role;
    const content = (item as Record<string, unknown>).content;
    if (role !== 'user' && role !== 'assistant' && role !== 'system') continue;
    if (typeof content !== 'string') continue;
    cleaned.push({ role, content: content.slice(0, MAX_HISTORY_MESSAGE_CHARS) });
  }
  return cleaned.slice(-MAX_HISTORY_MESSAGES);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { Allow: 'POST, OPTIONS', 'Cache-Control': 'no-store' },
    });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'POST, OPTIONS' });
  }
  if (!originAllowed(req)) {
    return json({ error: 'Origin not allowed' }, 403);
  }
  if (isThrottled(clientKey(req))) {
    return json({ error: 'Too many requests. Please slow down.' }, 429, {
      'Retry-After': '60',
    });
  }

  // The key is read here only. It is never echoed, logged, or returned.
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    // Honest, non-leaking failure: the UI shows this message as-is.
    return json({ error: 'AI provider is not configured on this deployment.' }, 503);
  }

  const declaredLength = Number(req.headers.get('content-length') || '0');
  if (declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'Request too large' }, 413);
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'Request too large' }, 413);
  }

  let body: ChatBody;
  try {
    body = JSON.parse(raw) as ChatBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return json({ error: 'message is required' }, 400);
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return json({ error: `message must be ${MAX_MESSAGE_CHARS} characters or fewer` }, 413);
  }

  const requestedModel = typeof body.model === 'string' ? body.model : DEFAULT_MODEL;
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

  const messages = [...sanitizeHistory(body.history), { role: 'user', content: message }];

  const payload: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    max_tokens: MAX_OUTPUT_TOKENS,
  };
  // Nemotron reasoning models emit thinking tokens unless told otherwise, which
  // would leave the visible answer empty.
  if (model.includes('nemotron')) {
    payload.chat_template_kwargs = { enable_thinking: false, force_nonempty_content: true };
  }

  let upstream: Response;
  try {
    upstream = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // Timeout / DNS / network. Upstream internals stay server-side.
    return json({ error: 'AI provider is unreachable right now.' }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    // Log the status code only (never headers, body, or the credential) so an
    // operator can diagnose from Vercel runtime logs. Upstream error text can
    // echo request metadata, so the caller still receives a generic message.
    console.error('[nvidia-chat] upstream rejected request', upstream.status);
    const status = upstream.status === 401 || upstream.status === 403 ? 503 : 502;
    return json({ error: 'AI provider rejected the request.', upstreamStatus: upstream.status }, status);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
