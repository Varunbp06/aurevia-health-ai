/**
 * Aurevia Health AI — Chat & Records API
 */
import { apiFetch, API_BASE, authHeaders, redirectToLogin } from './apiCore';

// ── Chat ─────────────────────────────────────────────────────────
export interface ChatMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export async function sendChat(message: string, model?: string): Promise<{ reply: string }> {
  const language = typeof window !== 'undefined' ? localStorage.getItem('app-language') || 'en' : 'en';
  return apiFetch('/chat', { method: 'POST', body: JSON.stringify({ message, model, language }) });
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  return apiFetch('/chat/history');
}

export async function clearChatHistory(): Promise<void> {
  await apiFetch('/chat/history', { method: 'DELETE' });
}

export async function getChatSuggestions(): Promise<{ suggestions: string[] }> {
  return apiFetch('/chat/suggestions');
}

export async function getChatContext(query: string): Promise<{ context: string; sources: any[] }> {
  return apiFetch(`/chat/context?q=${encodeURIComponent(query)}`);
}

// ── SSE Streaming Chat ───────────────────────────────────────────
//
// Resolution order, so the public demo keeps working without a deployed
// backend while never shipping a provider credential to the browser:
//   1. this app's own backend stream (`${API_BASE}/chat/stream`)
//   2. this app's own backend, non-streaming (`${API_BASE}/chat`)
//   3. the server-side provider proxy (`/api/nvidia-chat`), which holds the
//      provider key in the Vercel environment and is never in the bundle.
//
// Provider keys entered by a user in the Model Manager are their own and are
// stored in localStorage; they are forwarded to our backend as before.
export function streamChat(
  message: string,
  history: { role: string; content: string }[],
  onChunk: (data: Record<string, unknown>) => void,
  onDone: () => void,
  onError: (err: string) => void,
  ragScope: string = "patient",
  cloudProvider?: string,
  cloudApiKey?: string,
  model?: string
) {
  const controller = new AbortController();
  const language = typeof window !== 'undefined' ? localStorage.getItem('app-language') || 'en' : 'en';

  let p = cloudProvider || (typeof window !== 'undefined' ? localStorage.getItem('ai_cloud_provider') : null);
  let k = cloudApiKey || (typeof window !== 'undefined' ? localStorage.getItem('ai_cloud_api_key') : null);

  if (!p) {
    p = "custom";
    k = "cloudflare";
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
  };

  if (p) headers['x-ai-provider'] = p;
  if (k) headers['x-ai-api-key'] = k;

  let receivedContent = false;

  const unauthorized = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('healthcare-auth');
      redirectToLogin();
    }
    onError('Unauthorized');
  };

  /** Reads an OpenAI-compatible SSE stream (`data: {"choices":[{"delta":...}]}`). */
  const readProviderStream = async (res: Response): Promise<void> => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No stream');
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            receivedContent = true;
            onChunk({ reply: delta });
          }
        } catch { /* skip malformed frame */ }
      }
    }
  };

  /** Reads this app's own backend SSE envelope (`data: {reply|status}`). */
  const readBackendStream = async (res: Response): Promise<boolean> => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No stream');
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.reply) receivedContent = true;
          onChunk(data);
          if (data.status === 'complete') { onDone(); return true; }
          if (data.status === 'error') { onError(data.error || 'Unknown error'); return true; }
        } catch { /* skip malformed */ }
      }
    }
    return false;
  };

  const run = async () => {
    // 1 ── Backend stream
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, history, model, rag_scope: ragScope, language }),
        signal: controller.signal,
      });
      if (res.status === 401) { unauthorized(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // A static deployment answers unknown routes with the SPA shell. That is
      // not a working API, so a non-SSE body must fall through to the fallbacks
      // instead of ending the turn with an empty reply.
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        throw new Error('Chat backend unavailable');
      }
      const finished = await readBackendStream(res);
      if (!finished) onDone();
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (receivedContent) { onError(err?.message || 'Connection interrupted.'); return; }
    }

    // 2 ── Backend, non-streaming
    try {
      const syncRes = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message, history, language }),
        signal: controller.signal,
      });
      if (syncRes.status === 401) { unauthorized(); return; }
      if (!syncRes.ok) throw new Error(`HTTP ${syncRes.status}`);
      const syncData = await syncRes.json();
      const replyText = syncData?.response || syncData?.reply || "";
      if (!replyText) throw new Error('Empty backend reply');
      onChunk({ reply: replyText });
      onDone();
      return;
    } catch (fallbackErr: any) {
      if (fallbackErr?.name === 'AbortError') return;
    }

    // 3 ── Server-side provider proxy (holds the key; key never reaches here)
    try {
      const proxyRes = await fetch('/api/nvidia-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, model }),
        signal: controller.signal,
      });
      if (!proxyRes.ok) {
        const detail = await proxyRes.json().catch(() => ({} as { error?: string }));
        throw new Error(detail?.error || `HTTP ${proxyRes.status}`);
      }
      await readProviderStream(proxyRes);
      onDone();
    } catch (proxyErr: any) {
      if (proxyErr?.name === 'AbortError') return;
      onError(proxyErr?.message || "Connection interrupted.");
    }
  };

  void run();
  return () => controller.abort();
}

// ── Health Records ───────────────────────────────────────────────
export interface HealthRecord {
  id: number;
  record_type: string;
  data: Record<string, unknown>;
  prediction: string;
  timestamp: string;
}

export async function getRecords(): Promise<HealthRecord[]> {
  return apiFetch('/records');
}

export async function createRecord(data: {
  record_type: string;
  data: Record<string, unknown>;
  prediction: string;
}): Promise<HealthRecord> {
  return apiFetch('/records', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteRecord(id: number): Promise<void> {
  await apiFetch(`/records/${id}`, { method: 'DELETE' });
}
