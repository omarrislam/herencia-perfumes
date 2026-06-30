import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiGet, ApiError } from './api';

afterEach(() => vi.restoreAllMocks());

describe('apiGet', () => {
  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 })));
    await expect(apiGet('/api/x')).resolves.toEqual({ ok: 1 });
  });
  it('throws ApiError with status on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Nope' } }), { status: 404 })));
    await expect(apiGet('/api/x')).rejects.toMatchObject({ status: 404, message: 'Nope' } satisfies Partial<ApiError>);
  });
});
