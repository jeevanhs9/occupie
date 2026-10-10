import { useCallback, useEffect, useState } from 'react';
import {
  MOCK_RESERVATIONS,
  MOCK_TABLES,
  MOCK_WALK_INS,
} from '../services/mockData';
import { apiService, DATA_MODE } from '../services/api';
import { nextSeatableWaitlistEntry, recommendTable } from '../services/allocation';

const clone = (value) => value.map((item) => ({ ...item }));

function resultError(result) {
  return result.error || 'The API request failed. No changes were made.';
}

export function useOperationalData() {
  const demoMode = DATA_MODE === 'demo';
  const [tables, setTables] = useState(() => demoMode ? clone(MOCK_TABLES) : []);
  const [reservations, setReservations] = useState(() => demoMode ? clone(MOCK_RESERVATIONS) : []);
  const [waitlist, setWaitlist] = useState(() => demoMode ? clone(MOCK_WALK_INS) : []);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (demoMode) return { success: true };
    setLoading(true);
    setError(null);
    const [tableResult, reservationResult, waitlistResult] = await Promise.all([
      apiService.tables.list(),
      apiService.reservations.list(),
      apiService.waitlist.list(),
    ]);
    const failed = [tableResult, reservationResult, waitlistResult].find((result) => !result.success);
    if (failed) {
      setError(resultError(failed));
      setLoading(false);
      return { success: false, error: resultError(failed) };
    }
    setTables(tableResult.data?.tables || []);
    setReservations(reservationResult.data?.reservations || []);
    setWaitlist(waitlistResult.data?.waitlist || []);
    setLoading(false);
    return { success: true };
  }, [demoMode]);

  const refreshWaitlist = useCallback(async () => {
    if (demoMode) return { success: true };
    const result = await apiService.waitlist.list();
    if (!result.success) {
      setError(resultError(result));
      return result;
    }
    setWaitlist(result.data?.waitlist || []);
    setError(null);
    return result;
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) refresh();
  }, [demoMode, refresh]);

  const updateTableStatus = useCallback(async (tableId, status, partySize) => {
    if (!demoMode) {
      const result = await apiService.tables.updateStatus(tableId, status, partySize);
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      setTables((current) => current.map((table) => table.id === tableId ? result.data.table : table));
      setError(null);
      return result;
    }

    const target = tables.find((table) => table.id === tableId);
    if (!target) return { success: false, error: 'Table was not found.' };
    const availableTable = status === 'occupied' && target.status === 'available'
      ? recommendTable({ tables: [target], reservations, partySize })
      : null;
    if (status === 'occupied' && (!availableTable?.table || !partySize || partySize > target.capacity)) {
      return { success: false, error: 'Choose an available table and a party size that fits.' };
    }
    setTables((current) => current.map((table) => table.id === tableId ? {
      ...table,
      status,
      partySize: status === 'occupied' ? partySize : 0,
      timeSeated: status === 'occupied' ? (table.timeSeated || 'Just now') : null,
    } : table));
    return { success: true, data: { table: target } };
  }, [demoMode, reservations, tables]);

  const createTable = useCallback(async (table) => {
    if (!demoMode) {
      const result = await apiService.tables.create(table);
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      setTables((current) => [...current, result.data.table].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true })));
      setError(null);
      return result;
    }
    if (tables.some((existing) => existing.id === table.id)) {
      return { success: false, error: `Table ${table.id} already exists.` };
    }
    const created = { ...table, status: 'available', partySize: 0, timeSeated: null };
    setTables((current) => [...current, created].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true })));
    return { success: true, data: { table: created } };
  }, [demoMode, tables]);

  const createWaitlistEntry = useCallback(async (entry) => {
    if (!demoMode) {
      const result = await apiService.waitlist.create(entry);
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      setWaitlist((current) => [...current, result.data.waitlistEntry]);
      setError(null);
      return result;
    }

    const created = {
      ...entry,
      id: `WL-${Date.now()}`,
      status: 'waiting',
      waitMinutes: 0,
      quotedWait: null,
    };
    setWaitlist((current) => [...current, created]);
    return { success: true, data: { waitlistEntry: created } };
  }, [demoMode]);

  const seatWaitlistEntry = useCallback(async (entryId) => {
    const entry = waitlist.find((item) => item.id === entryId);
    if (!entry) return { success: false, error: 'Waitlist entry was not found.' };

    if (!demoMode) {
      const result = await apiService.waitlist.seat(entryId);
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      setWaitlist((current) => current.filter((item) => item.id !== entryId));
      setTables((current) => current.map((table) => table.id === result.data.table.id ? result.data.table : table));
      setError(null);
      return result;
    }

    const next = nextSeatableWaitlistEntry({
      waitlist,
      tables,
      reservations,
    });
    if (!next.entry) return { success: false, error: next.reason };
    if (next.entry.id !== entryId) {
      return { success: false, error: `${next.entry.partyName} has waited longer and can be seated now.` };
    }
    const { table } = next;
    const seatedAt = { ...table, status: 'occupied', partySize: entry.partySize, timeSeated: 'Just now' };
    setTables((current) => current.map((candidate) => candidate.id === table.id ? seatedAt : candidate));
    setWaitlist((current) => current.filter((item) => item.id !== entryId));
    return { success: true, data: { waitlistEntry: { ...entry, status: 'seated', table: table.id }, table: seatedAt } };
  }, [demoMode, reservations, tables, waitlist]);

  const updateWaitlistStatus = useCallback(async (entryId, status) => {
    if (!demoMode) {
      const result = await apiService.waitlist.updateStatus(entryId, status);
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      if (status === 'cancelled') setWaitlist((current) => current.filter((entry) => entry.id !== entryId));
      else setWaitlist((current) => current.map((entry) => entry.id === entryId ? result.data.waitlistEntry : entry));
      setError(null);
      return result;
    }
    if (status === 'cancelled') setWaitlist((current) => current.filter((entry) => entry.id !== entryId));
    else setWaitlist((current) => current.map((entry) => entry.id === entryId ? { ...entry, status } : entry));
    return { success: true };
  }, [demoMode]);

  const recommendReservation = useCallback(async ({ partySize, startsAt, seatingPreference }) => {
    if (!demoMode) {
      const result = await apiService.allocations.getRecommendations({
        partySize,
        at: startsAt,
        preferredSection: seatingPreference,
      });
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      if (!result.data?.available || !result.data.recommendation) {
        return { success: false, error: result.data?.message || 'No suitable table is available.' };
      }
      return { success: true, data: { recommendation: result.data.recommendation } };
    }

    const recommendation = recommendTable({
      tables,
      reservations,
      partySize,
      at: startsAt,
      preferredSection: seatingPreference,
    });
    return recommendation.table
      ? { success: true, data: { recommendation: recommendation.table } }
      : { success: false, error: recommendation.reason };
  }, [demoMode, reservations, tables]);

  const createReservation = useCallback(async (reservation) => {
    if (!demoMode) {
      const result = await apiService.reservations.create(reservation);
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      setReservations((current) => [...current, result.data.reservation]);
      setError(null);
      return result;
    }

    const { table, reason } = recommendTable({
      tables: reservation.tableId ? tables.filter((item) => item.id === reservation.tableId) : tables,
      reservations,
      partySize: reservation.partySize,
      at: reservation.startsAt,
      preferredSection: reservation.seatingPreference,
    });
    if (!table) return { success: false, error: reason };
    const created = {
      ...reservation,
      id: `RES-${Date.now()}`,
      table: table.id,
      time: new Date(reservation.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'confirmed',
    };
    setReservations((current) => [...current, created]);
    return { success: true, data: { reservation: created } };
  }, [demoMode, reservations, tables]);

  const seatReservation = useCallback(async (reservationId) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) return { success: false, error: 'Reservation was not found.' };
    if (!demoMode) {
      const result = await apiService.reservations.updateStatus(reservationId, 'seated');
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      setReservations((current) => current.map((item) => item.id === reservationId ? result.data.reservation : item));
      setTables((current) => current.map((table) => table.id === result.data.reservation.table ? {
        ...table,
        status: 'occupied',
        partySize: reservation.partySize,
        timeSeated: new Date().toISOString(),
      } : table));
      setError(null);
      return result;
    }

    const table = tables.find((item) => item.id === reservation.table);
    const canUseReservedAssignment = table?.status === 'reserved' && table.capacity >= reservation.partySize;
    const recommendation = canUseReservedAssignment
      ? { table, reason: '' }
      : recommendTable({
        tables,
        reservations: reservations.filter((item) => item.id !== reservationId),
        partySize: reservation.partySize,
        at: reservation.startsAt || reservation.time,
      });
    if (!recommendation.table) return { success: false, error: recommendation.reason };
    const seatedTable = { ...recommendation.table, status: 'occupied', partySize: reservation.partySize, timeSeated: 'Just now' };
    const seatedReservation = { ...reservation, status: 'seated', table: seatedTable.id };
    setTables((current) => current.map((item) => item.id === seatedTable.id ? seatedTable : item));
    setReservations((current) => current.map((item) => item.id === reservationId ? seatedReservation : item));
    return { success: true, data: { reservation: seatedReservation, table: seatedTable } };
  }, [demoMode, reservations, tables]);

  const updateReservationStatus = useCallback(async (reservationId, status) => {
    if (!demoMode) {
      const result = await apiService.reservations.updateStatus(reservationId, status);
      if (!result.success) {
        setError(resultError(result));
        return result;
      }
      setReservations((current) => current.map((item) => item.id === reservationId ? result.data.reservation : item));
      setError(null);
      return result;
    }
    setReservations((current) => current.map((item) => item.id === reservationId ? { ...item, status } : item));
    return { success: true };
  }, [demoMode]);

  return {
    dataMode: DATA_MODE,
    demoMode,
    tables,
    reservations,
    waitlist,
    loading,
    error,
    refresh,
    refreshWaitlist,
    updateTableStatus,
    createTable,
    createWaitlistEntry,
    seatWaitlistEntry,
    updateWaitlistStatus,
    recommendReservation,
    createReservation,
    seatReservation,
    updateReservationStatus,
  };
}
