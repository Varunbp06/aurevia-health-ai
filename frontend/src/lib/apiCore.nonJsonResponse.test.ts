import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from './apiCore';
import { ApiConnectionError } from './apiErrors';

/**
 * Regression coverage for the production failure mode where a reachable host
 * answers with HTML instead of JSON.
 *
 * This happens whenever the configured API base points at a static host or a
 * dead backend, because SPA fallback and 404 pages return 200 text/html. The
 * client used to hand that body to res.json(), which threw a raw SyntaxError
 * ("Unexpected token '<'") that escaped ApiConnectionError, so every caller
 * surfaced a parser message to the user instead of a real connection failure.
 */
describe('apiFetch non-JSON response handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('raises ApiConnectionError when a 200 response returns HTML', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('<!DOCTYPE html><html><body>SPA fallback</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    ) as unknown as typeof fetch;

    await expect(apiFetch('/profile')).rejects.toBeInstanceOf(ApiConnectionError);
  });

  it('raises ApiConnectionError when a JSON content-type carries an unparseable body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('{ this is not json', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const error = await apiFetch('/profile').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiConnectionError);
    expect(error).not.toBeInstanceOf(SyntaxError);
  });

  it('still returns parsed data for a genuine JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'u1', role: 'clinician' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    await expect(apiFetch('/profile')).resolves.toEqual({ id: 'u1', role: 'clinician' });
  });
});