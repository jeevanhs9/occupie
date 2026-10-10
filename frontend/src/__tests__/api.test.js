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
    expect(result.error).toBe('offline');
  });
});
