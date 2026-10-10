import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function jsonResponse(data, status = 200) {
  return { ok: status < 400, status, json: async () => data };
}

describe('API-backed operational data mode', () => {
  it('loads API state and updates the queue and table only after successful responses', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'api');
    vi.resetModules();
    const fetch = vi.fn(async (url, options = {}) => {
      if (url.endsWith('/tables') && (!options.method || options.method === 'GET')) return jsonResponse({ tables: [{ id: 'T01', name: 'Table 1', capacity: 2, status: 'available' }] });
      if (url.endsWith('/reservations') && (!options.method || options.method === 'GET')) return jsonResponse({ reservations: [] });
      if (url.endsWith('/waitlist') && (!options.method || options.method === 'GET')) return jsonResponse({ waitlist: [] });
      if (url.endsWith('/waitlist') && options.method === 'POST') {
        return jsonResponse({ waitlistEntry: { id: 'WL-API', partyName: 'API Party', partySize: 2, status: 'waiting', waitMinutes: 0, quotedWait: null } }, 201);
      }
      if (url.endsWith('/waitlist/WL-API/seat')) {
        return jsonResponse({
          waitlistEntry: { id: 'WL-API', partyName: 'API Party', partySize: 2, status: 'seated', table: 'T01' },
          table: { id: 'T01', name: 'Table 1', capacity: 2, status: 'occupied', partySize: 2 },
        });
      }
      throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal('fetch', fetch);
    const { useOperationalData } = await import('../hooks/useOperationalData');
    const { result } = renderHook(() => useOperationalData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.demoMode).toBe(false);
    expect(result.current.tables).toHaveLength(1);
    expect(result.current.waitlist).toHaveLength(0);

    let created;
    await act(async () => {
      created = await result.current.createWaitlistEntry({ partyName: 'API Party', partySize: 2 });
    });
    expect(created.success).toBe(true);
    expect(result.current.waitlist).toHaveLength(1);

    let seated;
    await act(async () => {
      seated = await result.current.seatWaitlistEntry('WL-API');
    });
    expect(seated.success).toBe(true);
    expect(result.current.waitlist).toHaveLength(0);
    expect(result.current.tables[0]).toMatchObject({ status: 'occupied', partySize: 2 });
  });

  it('keeps API errors visible without substituting demo fixtures', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'api');
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('backend offline')));
    const { useOperationalData } = await import('../hooks/useOperationalData');
    const { result } = renderHook(() => useOperationalData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('Could not connect to the Occupie API');
    expect(result.current.tables).toEqual([]);
    expect(result.current.reservations).toEqual([]);
    expect(result.current.waitlist).toEqual([]);
  });
});
