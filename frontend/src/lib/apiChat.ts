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

  let p = cloudProvider || (typeof window !== 'undefined' ? localStorage.getItem('ai_cloud_provider') : null);
  let k = cloudApiKey || (typeof window !== 'undefined' ? localStorage.getItem('ai_cloud_api_key') : null);
  const nvidiaKey = typeof window !== 'undefined' ? (import.meta.env.VITE_NVIDIA_API_KEY as string) : '';

  // If no provider set but we have an NVIDIA key, use it directly
  if (nvidiaKey && !k) {
    p = 'nvidia';
    k = nvidiaKey;
  }

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

  const language = typeof window !== 'undefined' ? localStorage.getItem('app-language') || 'en' : 'en';
  const useDirectNvidia = nvidiaKey && p === 'nvidia';

  // When backend is unreachable and NVIDIA key is available, call NVIDIA API directly
  if (useDirectNvidia) {
    const nvidiaMessages = history.map((m: any) => ({ role: m.role, content: m.content }));
    nvidiaMessages.push({ role: 'user', content: message });

    fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${k}`,
      },
      body: JSON.stringify({
        model: model || 'nvidia/llama-3.3-nemotron-super-49b-v1',
        messages: nvidiaMessages,
        stream: true,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`NVIDIA API HTTP ${res.status}`);
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No stream');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') { onDone(); return; }
              try {
                const parsed = JSON.parse(payload);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) { receivedContent = true; onChunk({ reply: delta }); }
              } catch { /* skip */ }
            }
          }
        }
        onDone();
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        onError(err.message || 'NVIDIA API connection failed');
      });
    return () => controller.abort();
  }

  fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history, model, rag_scope: ragScope, language }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('healthcare-auth');
          redirectToLogin();
        }
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.reply) {
                receivedContent = true;
              }
              onChunk(data);
              if (data.status === 'complete') { onDone(); return; }
              if (data.status === 'error') { onError(data.error || 'Unknown error'); return; }
            } catch { /* skip malformed */ }
          }
        }
      }
      onDone();
    })
    .catch(async (err) => {
      if (err.name === 'AbortError') return;

      if (!receivedContent) {
        try {
          const syncRes = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ message, history, language }),
          });
          if (syncRes.status === 401) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('healthcare-auth');
              redirectToLogin();
            }
            throw new Error('Unauthorized');
          }
          if (!syncRes.ok) throw new Error(`HTTP ${syncRes.status}`);
          const syncData = await syncRes.json();
          const replyText = syncData.response || syncData.reply || "";
          onChunk({ reply: replyText });
          onDone();
          return;
        } catch (fallbackErr: any) {
          onError(fallbackErr.message || "Connection interrupted.");
          return;
        }
      }

      onError(err.message || "Connection interrupted.");
    });

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
