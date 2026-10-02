import { describe, it, expect, vi, afterEach } from 'vitest';
import { login } from '@/lib/apiAuth';
import { ApiConnectionError } from '@/lib/apiErrors';

/**
 * The login helper posts form-encoded credentials outside the shared apiFetch
 * wrapper, so it needs its own transport handling. Without it a network failure
 * surfaced the browser's raw "TypeError: Failed to fetch" and a host answering
 * with HTML surfaced a raw SyntaxError, neither of which told the user the
 * backend was unreachable.
 */
describe('login transport failure handling', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('raises ApiConnectionError when the request cannot be completed', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    const error = await login('someone', 'whatever').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiConnectionError);
    expect((error as Error).message).not.toContain('Failed to fetch');
  });

  it('raises ApiConnectionError when the host answers with HTML', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('<!DOCTYPE html><html>SPA fallback</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    ) as unknown as typeof fetch;

    await expect(login('someone', 'whatever')).rejects.toBeInstanceOf(ApiConnectionError);
  });

  it('still reports a genuine credential rejection', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Incorrect username or password' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const error = await login('someone', 'wrong').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ApiConnectionError);
    expect((error as Error).message).toBe('Incorrect username or password');
  });

  it('returns the token payload on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'tok', token_type: 'bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    await expect(login('someone', 'correct')).resolves.toEqual({
      access_token: 'tok',
      token_type: 'bearer',
    });
  });
});