import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PageEntrance } from '../../../components/ui/PageEntrance';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { useOperationalData } from '../../../hooks/useOperationalData';
import { apiService } from '../../../services/api';
import { nextSeatableWaitlistEntry, recommendTable } from '../../../services/allocation';
import {
  UserPlus,
  Clock,
  CheckCircle,
  CircleAlert,
  Sparkles,
  Armchair,
  RotateCw,
  Users,
  CalendarDays,
  X,
} from 'lucide-react';
import './host-dashboard.css';

const ACTIVE_RESERVATION_STATUSES = new Set(['confirmed', 'checked_in']);
const motionEase = [0.22, 1, 0.36, 1];

function readableTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function reservationTime(reservation) {
  return reservation.startsAt || reservation.time || '';
}

function statusLabel(status) {
  return String(status || 'confirmed').replaceAll('_', ' ');
}

function statusVariant(status) {
  if (status === 'checked_in') return 'teal';
  if (status === 'confirmed') return 'success';
  return 'default';
}

function arrivalTimestamp(entry, now) {
  const createdAt = entry.createdAt ? new Date(entry.createdAt).getTime() : Number.NaN;
  if (Number.isFinite(createdAt)) return createdAt;
  const waitMinutes = Number(entry.waitMinutes);
  return Number.isFinite(waitMinutes) ? now - Math.max(0, waitMinutes) * 60_000 : now;
}

function waitLabel(entry, now, demoMode) {
  if (entry.createdAt) {
    const createdAt = new Date(entry.createdAt).getTime();
    if (!Number.isFinite(createdAt)) return 'Wait time unavailable';
    const minutes = Math.max(0, Math.floor((now - createdAt) / 60_000));
    return `Waiting ${minutes} min`;
  }
  if (demoMode && Number.isFinite(Number(entry.waitMinutes))) {
    return `Waiting ${Math.max(0, Number(entry.waitMinutes))} min · preview`;
  }
  return 'Wait time unavailable';
}

export function HostDashboard() {
  const {
    tables,
    reservations,
    waitlist: walkIns,
    loading,
    error,
    refresh,
    dataMode,
    demoMode,
    createWaitlistEntry,
    seatWaitlistEntry,
    updateWaitlistStatus,
    seatReservation,
    updateReservationStatus,
    requestReservationReassignment,
    recommendReservation,
  } = useOperationalData();
  const prefersReducedMotion = useReducedMotion();
  const [actionNotice, setActionNotice] = useState(null);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ partyName: '', partySize: '2', contact: '' });
  const [savingWalkIn, setSavingWalkIn] = useState(false);
  const [pendingActions, setPendingActions] = useState(() => new Set());
  const [confirmNoShowId, setConfirmNoShowId] = useState(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [reservationSearch, setReservationSearch] = useState('');
  const [reassignmentTargets, setReassignmentTargets] = useState({});
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [serverRecommendations, setServerRecommendations] = useState({});
  const [clock, setClock] = useState(() => Date.now());
  const actionLocks = useRef(new Set());
  const walkInLock = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (demoMode) return undefined;
    let active = true;
    apiService.settings.get().then((result) => {
      if (active && result.success) setGracePeriodMinutes(result.data.settings.gracePeriodMinutes ?? 15);
    });
    return () => { active = false; };
  }, [demoMode]);

  const canSeat = (partySize) => tables.filter((table) =>
    recommendTable({ tables: [table], reservations, partySize }).table
  );
  const availableTwoTops = canSeat(2).filter((table) => table.capacity === 2).length;
  const availableFourTops = canSeat(4).filter((table) => table.capacity === 4).length;
  const availableSixPlus = canSeat(6).filter((table) => table.capacity >= 6).length;

  const activeReservations = useMemo(() => reservations
    .filter((reservation) => ACTIVE_RESERVATION_STATUSES.has(reservation.status))
    .sort((left, right) => {
      const leftTime = new Date(reservationTime(left)).getTime();
      const rightTime = new Date(reservationTime(right)).getTime();
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime;
      return String(reservationTime(left)).localeCompare(String(reservationTime(right)));
    }), [reservations]);

  const visibleReservations = useMemo(() => {
    const query = reservationSearch.trim().toLocaleLowerCase();
    if (!query) return activeReservations;
    return activeReservations.filter((reservation) => [reservation.guestName, reservation.id, reservation.table, reservation.phone]
      .some((value) => String(value || '').toLocaleLowerCase().includes(query)));
  }, [activeReservations, reservationSearch]);

  const orderedWalkIns = useMemo(() => [...walkIns]
    .filter((entry) => ['waiting', 'ready'].includes(entry.status))
    .sort((left, right) => arrivalTimestamp(left, clock) - arrivalTimestamp(right, clock)
      || String(left.id).localeCompare(String(right.id))), [walkIns, clock]);

  const waitlistKey = walkIns.filter((entry) => ['waiting', 'ready'].includes(entry.status))
    .map((entry) => `${entry.id}:${entry.partySize}`).join('|');
  useEffect(() => {
    if (demoMode) return undefined;
    let active = true;
    const at = new Date().toISOString();
    Promise.all(orderedWalkIns.map(async (entry) => {
      const result = await recommendReservation({ partySize: entry.partySize, startsAt: at });
      return [entry.id, result.success
        ? { table: result.data.recommendation, reason: result.data.reason }
        : { table: null, reason: result.error || 'No suitable table is available.' }];
    })).then((pairs) => {
      if (active) setServerRecommendations(Object.fromEntries(pairs));
    });
    return () => { active = false; };
  }, [demoMode, waitlistKey, recommendReservation]);

  const localNextSeatable = nextSeatableWaitlistEntry({ waitlist: orderedWalkIns, tables, reservations });
  const serverNextEntry = orderedWalkIns.find((entry) => serverRecommendations[entry.id]?.table);
  const nextSeatable = demoMode
    ? localNextSeatable
    : serverNextEntry
      ? { entry: serverNextEntry, table: serverRecommendations[serverNextEntry.id].table, reason: serverRecommendations[serverNextEntry.id].reason }
      : { entry: null, table: null, reason: orderedWalkIns.length ? (serverRecommendations[orderedWalkIns[0].id]?.reason || 'Checking current availability with the restaurant API.') : 'No parties are waiting.' };
  const nextSeatableId = nextSeatable.entry?.id;
  const dataUnavailable = loading || Boolean(error);

  const runAction = async (key, action) => {
    if (actionLocks.current.has(key)) return;
    actionLocks.current.add(key);
    setPendingActions((current) => new Set(current).add(key));
    try {
      await action();
    } finally {
      actionLocks.current.delete(key);
      setPendingActions((current) => {
        const updated = new Set(current);
        updated.delete(key);
        return updated;
      });
    }
  };

  const handleSeatReservation = (reservation) => runAction(`reservation:${reservation.id}`, async () => {
    const result = await seatReservation(reservation.id);
    setActionNotice(result.success
      ? { type: 'success', message: `Seated ${reservation.guestName} at ${result.data.table?.id || reservation.table}.` }
      : { type: 'error', message: `Could not seat ${reservation.guestName}: ${result.error}` });
  });

  const handleCheckIn = (reservation) => runAction(`reservation:${reservation.id}`, async () => {
    const result = await updateReservationStatus(reservation.id, 'checked_in');
    setActionNotice(result.success
      ? { type: 'success', message: `${reservation.guestName} checked in.` }
      : { type: 'error', message: `Could not check in ${reservation.guestName}: ${result.error}` });
  });

  const handleRequestReassignment = (reservation) => runAction(`reassign:${reservation.id}`, async () => {
    const targetId = reassignmentTargets[reservation.id];
    if (!targetId) {
      setActionNotice({ type: 'error', message: 'Choose an available table to request a change.' });
      return;
    }
    const result = await requestReservationReassignment(reservation.id, targetId, 'Host requested a table change');
    setActionNotice(result.success
      ? { type: 'success', message: `Table change request for ${reservation.guestName} was sent to a manager.` }
      : { type: 'error', message: `Could not request a table change: ${result.error}` });
  });

  const isNoShowEligible = (reservation) => {
    if (demoMode) return true;
    const startsAt = new Date(reservation.startsAt || reservation.time).getTime();
    return Number.isFinite(startsAt) && clock >= startsAt + gracePeriodMinutes * 60_000;
  };

  const handleSeatWalkIn = (entry) => runAction(`waitlist:${entry.id}`, async () => {
    const result = await seatWaitlistEntry(entry.id);
    setActionNotice(result.success
      ? { type: 'success', message: `Seated ${entry.partyName} at ${result.data.table.id}.` }
      : { type: 'error', message: `Could not seat ${entry.partyName}: ${result.error}` });
  });

  const handleWalkInSubmit = async (event) => {
    event.preventDefault();
    if (walkInLock.current) return;
    const partyName = walkInForm.partyName.trim();
    const partySize = Number(walkInForm.partySize);
    if (!partyName || !Number.isInteger(partySize) || partySize < 1 || partySize > 30) return;

    walkInLock.current = true;
    setSavingWalkIn(true);
    const result = await createWaitlistEntry({
      partyName,
      partySize,
      contact: walkInForm.contact.trim(),
    });
    walkInLock.current = false;
    setSavingWalkIn(false);
    if (!result.success) {
      setActionNotice({ type: 'error', message: `Could not add ${partyName}: ${result.error}` });
      return;
    }
    setActionNotice({ type: 'success', message: `${partyName} was added to the waitlist.` });
    setWalkInForm({ partyName: '', partySize: '2', contact: '' });
    setShowWalkInForm(false);
  };

  const handleNoShow = (reservation) => runAction(`reservation:${reservation.id}`, async () => {
    const result = await updateReservationStatus(reservation.id, 'no_show');
    setConfirmNoShowId(null);
    setActionNotice(result.success
      ? { type: 'success', message: `${reservation.guestName} was marked as a no-show.` }
      : { type: 'error', message: `Could not update reservation: ${result.error}` });
  });

  const handleRemoveWalkIn = (entry) => runAction(`waitlist:${entry.id}`, async () => {
    const result = await updateWaitlistStatus(entry.id, 'cancelled');
    setConfirmRemoveId(null);
    setActionNotice(result.success
      ? { type: 'success', message: `${entry.partyName} was removed from the waitlist.` }
      : { type: 'error', message: `Could not remove ${entry.partyName}: ${result.error}` });
  });

  const revealProps = (index) => prefersReducedMotion ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.34, delay: index * 0.055, ease: motionEase },
  };

  return (
    <PageEntrance className="host-dashboard space-y-6 sm:space-y-8">
      <header className="host-dashboard__masthead">
        <motion.div {...revealProps(0)}>
          <p className="host-dashboard__eyebrow">Occupie · Front of house</p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="host-dashboard__title">Host Stand &amp; Seating Desk</h2>
            <Badge variant="teal" size="sm">Front-of-House</Badge>
          </div>
          <p className="host-dashboard__intro">
            A clear view of tonight’s arrivals, the walk-in queue, and the tables ready to welcome them.
          </p>
        </motion.div>

        <motion.div className="host-dashboard__masthead-actions" {...revealProps(1)}>
          <span className={`host-dashboard__source ${demoMode ? 'is-preview' : 'is-live'}`}>
            <span aria-hidden="true" className="host-dashboard__source-dot" />
            {demoMode ? 'Preview data · resets on reload' : 'Connected restaurant data'}
          </span>
          {!demoMode && (
            <Button
              size="sm"
              variant="secondary"
              onClick={refresh}
              disabled={loading}
              isLoading={loading}
              icon={RotateCw}
            >
              Refresh
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowWalkInForm((isOpen) => !isOpen)}
            icon={UserPlus}
            aria-expanded={showWalkInForm}
            aria-controls="host-walkin-form"
          >
            {showWalkInForm ? 'Close Walk-In Form' : 'Add Walk-In'}
          </Button>
        </motion.div>
      </header>

      <div className="host-dashboard__shiftline" aria-label="Shift overview">
        <span><CalendarDays aria-hidden="true" /> Current service</span>
        <span><Users aria-hidden="true" /> {dataUnavailable ? '—' : `${activeReservations.length} active reservations`}</span>
        <span><Clock aria-hidden="true" /> {dataUnavailable ? '—' : `${orderedWalkIns.length} parties waiting`}</span>
        <span className="host-dashboard__shiftline-rule" />
      </div>

      {(loading || error) && (
        <div role={error ? 'alert' : 'status'} className={`host-dashboard__feedback ${error ? 'is-error' : ''}`}>
          {loading ? 'Loading authorized restaurant data…' : error}
          {error && <button type="button" className="ml-3 font-semibold underline" onClick={refresh}>Retry</button>}
        </div>
      )}

      <AnimatePresence initial={false}>
        {showWalkInForm && (
          <motion.section
            id="host-walkin-form"
            className="host-dashboard__walkin-panel"
            aria-label="Register a walk-in party"
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0, y: -6 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: motionEase }}
          >
            <div className="host-dashboard__walkin-heading">
              <div>
                <p className="host-dashboard__eyebrow">New arrival</p>
                <h3>Register a walk-in</h3>
                <p>Add the party to the arrival-ordered queue. Wait estimates are shown only when service data supports them.</p>
              </div>
            </div>
            <form onSubmit={handleWalkInSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
              <Input
                label="Party name"
                value={walkInForm.partyName}
                onChange={(event) => setWalkInForm((form) => ({ ...form, partyName: event.target.value }))}
                placeholder="e.g. The Garcia party"
                required
                maxLength={120}
                autoComplete="off"
              />
              <Input
                label="Guests"
                type="number"
                min="1"
                max="30"
                step="1"
                value={walkInForm.partySize}
                onChange={(event) => setWalkInForm((form) => ({ ...form, partySize: event.target.value }))}
                required
              />
              <Input
                label="Contact (optional)"
                type="tel"
                value={walkInForm.contact}
                onChange={(event) => setWalkInForm((form) => ({ ...form, contact: event.target.value }))}
                placeholder="Phone number"
                maxLength={40}
                autoComplete="tel"
              />
              <Button type="submit" variant="accent" icon={UserPlus} isLoading={savingWalkIn}>
                {savingWalkIn ? 'Adding party…' : 'Add to Queue'}
              </Button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {actionNotice && (
        <div role={actionNotice.type === 'error' ? 'alert' : 'status'} className={`host-dashboard__notice ${actionNotice.type === 'error' ? 'is-error' : ''}`}>
          {actionNotice.type === 'error'
            ? <CircleAlert aria-hidden="true" />
            : <CheckCircle aria-hidden="true" />}
          <span>{actionNotice.message}</span>
          <button type="button" onClick={() => setActionNotice(null)} aria-label="Dismiss notice">&times;</button>
        </div>
      )}

      <section id="availability" aria-label="Table availability" className="host-dashboard__availability scroll-mt-24">
        <div className="host-dashboard__section-heading">
          <div>
            <p className="host-dashboard__eyebrow">The floor</p>
            <h3>Available by party size</h3>
          </div>
          <span>Current availability · reservation holds applied</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Two guests" value={dataUnavailable ? '—' : availableTwoTops} subtitle={loading ? 'Checking floor…' : error ? 'Availability could not be loaded' : 'Available tables · capacity 2'} icon={Armchair} accentColor="teal" className="host-dashboard__stat" />
          <StatCard title="Four guests" value={dataUnavailable ? '—' : availableFourTops} subtitle={loading ? 'Checking floor…' : error ? 'Availability could not be loaded' : 'Available tables · capacity 4'} icon={Armchair} accentColor="cyan" className="host-dashboard__stat" />
          <StatCard title="Six or more" value={dataUnavailable ? '—' : availableSixPlus} subtitle={loading ? 'Checking floor…' : error ? 'Availability could not be loaded' : 'Available tables · capacity 6+'} icon={Armchair} accentColor="amber" className="host-dashboard__stat" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 host-dashboard__workbench">
        <section className="lg:col-span-7 space-y-6" aria-label="Reservation schedule">
          <Card id="reservations" className="host-dashboard__panel scroll-mt-24">
            <CardHeader
              action={<Badge variant="teal" size="sm">{dataUnavailable ? '—' : `${activeReservations.length} active`}</Badge>}
              className="host-dashboard__panel-header"
            >
              <p className="host-dashboard__eyebrow">Tonight</p>
              <CardTitle>Reservation schedule</CardTitle>
              <CardDescription>Arrivals are ordered by booking time. Table assignment is checked again when seating.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4">
                <Input label="Search reservations" value={reservationSearch} onChange={(event) => setReservationSearch(event.target.value)} placeholder="Guest, reference, table, or phone" />
              </div>
              {visibleReservations.length ? (
                <div className="divide-y divide-stone-200/80">
                  <AnimatePresence initial={false}>
                    {visibleReservations.map((reservation, index) => {
                      const pending = pendingActions.has(`reservation:${reservation.id}`);
                      const confirmingNoShow = confirmNoShowId === reservation.id;
                      return (
                        <motion.article
                          key={reservation.id}
                          layout={!prefersReducedMotion}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, delay: Math.min(index * 0.025, 0.15), ease: motionEase }}
                          className="host-dashboard__reservation"
                        >
                          <div className="host-dashboard__reservation-time">
                            <span>{readableTime(reservation.startsAt || reservation.time)}</span>
                            <span>Arrival</span>
                          </div>
                          <div className="host-dashboard__reservation-details">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4>{reservation.guestName || 'Guest'}</h4>
                              <Badge variant={statusVariant(reservation.status)} size="sm">{statusLabel(reservation.status)}</Badge>
                            </div>
                            <p>Party of {reservation.partySize} <span aria-hidden="true">·</span> {reservation.table ? `Table ${reservation.table}` : 'Table unassigned'}</p>
                            {reservation.notes && <p className="host-dashboard__note">{reservation.notes}</p>}
                            {reservation.phone && <p className="host-dashboard__contact">{reservation.phone}</p>}
                          </div>
                          <div className="host-dashboard__reservation-actions">
                            {reservation.status === 'confirmed' ? (
                              <Button size="sm" variant="secondary" onClick={() => handleCheckIn(reservation)} disabled={pending} isLoading={pending}>Check in</Button>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => handleSeatReservation(reservation)} disabled={pending} isLoading={pending}>Seat guest</Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setConfirmNoShowId(confirmingNoShow ? null : reservation.id)} disabled={pending || !isNoShowEligible(reservation)} title={!isNoShowEligible(reservation) ? `No-show becomes available after the ${gracePeriodMinutes}-minute arrival grace period.` : undefined}>
                              No-show
                            </Button>
                          </div>
                          {!demoMode && ['confirmed', 'checked_in'].includes(reservation.status) && (
                            <div className="host-dashboard__reservation-reassignment">
                              <label className="sr-only" htmlFor={`reassign-${reservation.id}`}>New table for {reservation.guestName}</label>
                              <select id={`reassign-${reservation.id}`} value={reassignmentTargets[reservation.id] || ''} onChange={(event) => setReassignmentTargets((current) => ({ ...current, [reservation.id]: event.target.value }))}>
                                <option value="">Choose another table</option>
                                {tables.filter((table) => table.status === 'available' && table.id !== reservation.table && table.capacity >= reservation.partySize).map((table) => <option key={table.id} value={table.id}>{table.name} · {table.capacity} seats</option>)}
                              </select>
                              <Button size="sm" variant="outline" onClick={() => handleRequestReassignment(reservation)} disabled={pending || !reassignmentTargets[reservation.id]}>Request manager approval</Button>
                            </div>
                          )}
                          <AnimatePresence initial={false}>
                            {confirmingNoShow && (
                              <motion.div
                                className="host-dashboard__confirm"
                                role="group"
                                aria-label={`Confirm no-show for ${reservation.guestName || 'this guest'}`}
                                initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                              >
                                <p>Mark {reservation.guestName || 'this guest'} as a no-show?</p>
                                <div>
                                  <Button size="sm" variant="ghost" onClick={() => setConfirmNoShowId(null)} disabled={pending}>Keep booking</Button>
                                  <Button size="sm" variant="danger" onClick={() => handleNoShow(reservation)} disabled={pending} isLoading={pending}>Confirm no-show</Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState title={loading ? 'Loading reservations' : error ? 'Schedule unavailable' : reservationSearch ? 'No matching reservations' : 'No active reservations'} description={loading ? 'The reservation schedule is being refreshed.' : error ? 'Retry the data request to load the current bookings.' : reservationSearch ? 'Try another name, reference, table, or phone number.' : 'New bookings will appear here when they are created.'} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-5 space-y-6" aria-label="Walk-in waitlist and seating rules">
          <Card id="waitlist" className="host-dashboard__panel scroll-mt-24">
            <CardHeader
              action={<span className="host-dashboard__queue-count">{dataUnavailable ? '—' : `${orderedWalkIns.length} waiting`}</span>}
              className="host-dashboard__panel-header"
            >
              <p className="host-dashboard__eyebrow">Arrivals</p>
              <CardTitle>Walk-in waitlist</CardTitle>
              <CardDescription>Oldest arrival with a suitable open table is next to seat.</CardDescription>
            </CardHeader>
            <div id="walk-in-queue" className="scroll-mt-24">
            <CardContent className="p-0">
              {orderedWalkIns.length ? (
                <ol className="divide-y divide-stone-200/80">
                  <AnimatePresence initial={false}>
                    {orderedWalkIns.map((entry, index) => {
                      const recommendation = demoMode
                        ? recommendTable({ tables, reservations, partySize: entry.partySize })
                        : serverRecommendations[entry.id] || { table: null, reason: 'Checking current availability with the restaurant API.' };
                      const isNext = entry.id === nextSeatableId;
                      const pending = pendingActions.has(`waitlist:${entry.id}`);
                      const confirmingRemoval = confirmRemoveId === entry.id;
                      return (
                        <motion.li
                          key={entry.id}
                          layout={!prefersReducedMotion}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, delay: Math.min(index * 0.025, 0.15), ease: motionEase }}
                          className={`host-dashboard__queue-entry ${isNext ? 'is-next' : ''}`}
                        >
                          <div className="host-dashboard__queue-index" aria-label={`Queue position ${index + 1}`}>{String(index + 1).padStart(2, '0')}</div>
                          <div className="host-dashboard__queue-main">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4>{entry.partyName}</h4>
                              {isNext && <Badge variant="teal" size="sm">Next to seat</Badge>}
                              {entry.status === 'ready' && <Badge variant="success" size="sm">Table ready</Badge>}
                            </div>
                            <p>Party of {entry.partySize} <span aria-hidden="true">·</span> {waitLabel(entry, clock, demoMode)}</p>
                            <p className="host-dashboard__recommendation">
                              <Sparkles aria-hidden="true" />
                              {recommendation.table
                                ? `Suggested ${recommendation.table.id} · ${recommendation.table.capacity} seats · smallest suitable fit`
                                : recommendation.reason}
                            </p>
                            {demoMode && entry.quotedWait && <p className="host-dashboard__preview-quote">Preview quote: {entry.quotedWait}</p>}
                          </div>
                          <div className="host-dashboard__queue-actions">
                            <Button
                              size="sm"
                              variant={entry.status === 'ready' ? 'accent' : 'secondary'}
                              className="host-dashboard__allocate"
                              onClick={() => handleSeatWalkIn(entry)}
                              disabled={pending || !recommendation.table || (!demoMode && !serverRecommendations[entry.id])}
                              isLoading={pending}
                              title="Seating is confirmed immediately; availability is rechecked by the service."
                            >
                              Seat party
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="host-dashboard__remove"
                              onClick={() => setConfirmRemoveId(confirmingRemoval ? null : entry.id)}
                              disabled={pending}
                              aria-label={`Remove ${entry.partyName} from waitlist`}
                              title="Remove from waitlist"
                            >
                              <X aria-hidden="true" />
                            </Button>
                          </div>
                          <AnimatePresence initial={false}>
                            {confirmingRemoval && (
                              <motion.div
                                className="host-dashboard__confirm host-dashboard__queue-confirm"
                                role="group"
                                aria-label={`Confirm waitlist removal for ${entry.partyName}`}
                                initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                              >
                                <p>Remove {entry.partyName} from the waitlist?</p>
                                <div>
                                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveId(null)} disabled={pending}>Keep party</Button>
                                  <Button size="sm" variant="danger" onClick={() => handleRemoveWalkIn(entry)} disabled={pending} isLoading={pending}>Confirm removal</Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ol>
              ) : (
                <EmptyState title={loading ? 'Loading waitlist' : error ? 'Waitlist unavailable' : 'The waitlist is clear'} description={loading ? 'Arrivals are being refreshed.' : error ? 'Retry the data request to load current arrivals.' : 'Register a walk-in party to begin an arrival-ordered queue.'} actionLabel={!loading && !error ? 'Add a walk-in' : undefined} onAction={() => setShowWalkInForm(true)} />
              )}
            </CardContent>
            </div>
          </Card>

          <Card id="seating-recommendations" className="host-dashboard__rule-panel scroll-mt-24">
            <CardContent className="p-5 sm:p-6">
              <div className="host-dashboard__rule-heading"><Sparkles aria-hidden="true" /><span>How seating is suggested</span></div>
              <p>Occupie checks current table availability, party capacity, and nearby confirmed reservation holds, then prefers the smallest suitable table. The server revalidates before seating. Occupied-table turnover and future wait times are not predicted.</p>
              {nextSeatable.table && nextSeatable.entry && (
                <div className="host-dashboard__rule-pick">
                  <span>Next eligible party</span>
                  <strong>{nextSeatable.entry.partyName} <span>→</span> {nextSeatable.table.id}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
      <span className="sr-only">Data source: {demoMode ? 'preview fixtures' : dataMode === 'api' ? 'restaurant API' : 'configured service'}.</span>
    </PageEntrance>
  );
}

export default HostDashboard;
