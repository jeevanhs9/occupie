import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiService } from '../services/api';

afterEach(() => vi.unstubAllGlobals());

describe('central API client', () => {
  it('returns a failure response for HTTP errors instead of fabricating success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Conflict', message: 'No suitable table is available.' }),
    }));

    const result = await apiService.waitlist.seat('WL-1');

    expect(result.success).toBe(false);
    expect(result.status).toBe(409);
    expect(result.error).toBe('No suitable table is available.');
  });

  it('returns a network failure when the backend cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const result = await apiService.tables.list();

    expect(result.success).toBe(false);
    expect(result.isNetworkError).toBe(true);
    expect(result.error).toContain('Could not connect to the Occupie API');
    expect(result.cause).toBe('offline');
  });

  it('does not retry operational 401 responses through a refresh endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Sign in to continue.' }),
    });
    vi.stubGlobal('fetch', fetch);

    const result = await apiService.tables.list();

    expect(result.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/tables$/);
  });
});
