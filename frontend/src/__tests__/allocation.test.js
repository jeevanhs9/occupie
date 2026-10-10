import { describe, expect, it } from 'vitest';
import { nextSeatableWaitlistEntry, recommendTable } from '../services/allocation';

describe('deterministic allocation preview', () => {
  const at = new Date('2026-10-10T19:00:00.000Z');

  it('selects the smallest available table that fits and prefers the requested section', () => {
    const tables = [
      { id: 'T01', capacity: 6, status: 'available', section: 'Main Dining' },
      { id: 'T02', capacity: 4, status: 'available', section: 'Window Patio' },
      { id: 'T03', capacity: 2, status: 'occupied', section: 'Window Patio' },
    ];
    const result = recommendTable({ tables, partySize: 3, preferredSection: 'Window Patio', at });
    expect(result.table.id).toBe('T02');
  });

  it('respects reservation holds and does not predict occupied table turnover', () => {
    const tables = [
      { id: 'T01', capacity: 2, status: 'available', section: 'Main Dining' },
      { id: 'T02', capacity: 4, status: 'occupied', section: 'Main Dining' },
    ];
    const reservations = [{ id: 'R1', table: 'T01', startsAt: '2026-10-10T19:45:00.000Z', status: 'confirmed' }];
    const result = recommendTable({ tables, reservations, partySize: 2, at });
    expect(result.table).toBeNull();
    expect(result.reason).toMatch(/not predicted/);
  });

  it('serves the oldest party that currently fits before later parties', () => {
    const waitlist = [
      { id: 'WL-2', partyName: 'Second', partySize: 2, status: 'waiting', waitMinutes: 12 },
      { id: 'WL-1', partyName: 'First', partySize: 4, status: 'waiting', waitMinutes: 35 },
    ];
    const tables = [{ id: 'T01', capacity: 4, status: 'available', section: 'Main Dining' }];
    const result = nextSeatableWaitlistEntry({ waitlist, tables, at });
    expect(result.entry.id).toBe('WL-1');
    expect(result.table.id).toBe('T01');
  });
});
