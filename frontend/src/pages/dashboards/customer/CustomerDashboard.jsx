import React, { useEffect, useMemo, useState } from 'react';
import { PageEntrance } from '../../../components/ui/PageEntrance';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { OperationalDataStatus } from '../../../components/common/OperationalDataStatus';
import { useOperationalData } from '../../../hooks/useOperationalData';
import { useRole } from '../../../hooks/useRole';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  History,
  LoaderCircle,
  MapPin,
  PartyPopper,
  Plus,
  RefreshCw,
  TicketCheck,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import './customer-dashboard.css';

function toLocalDateTimeValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function getStatusStyle(status) {
  if (status === 'confirmed' || status === 'ready') return 'success';
  if (status === 'checked_in') return 'info';
  if (status === 'cancelled' || status === 'no_show') return 'danger';
  if (status === 'seated') return 'teal';
  return 'default';
}

function formatReservationDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function ReservationCard({ reservation, onStatusChange, pending }) {
  const canCheckIn = reservation.status === 'confirmed';
  const canCancel = ['confirmed', 'checked_in'].includes(reservation.status);
  const time = reservation.startsAt
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(reservation.startsAt))
    : reservation.time || 'Time unavailable';

  return (
    <Card className="customer-record">
      <div className="customer-record__topline">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusStyle(reservation.status)} dot>
            {String(reservation.status || 'unknown').replaceAll('_', ' ')}
          </Badge>
          {reservation.id && <span className="customer-reference">{reservation.id}</span>}
        </div>
        <span className="customer-record__date">{formatReservationDate(reservation.startsAt)}</span>
      </div>
      <div className="customer-record__body">
        <div>
          <h4 className="customer-record__title">{reservation.restaurantName || 'Your restaurant'}</h4>
          <div className="customer-record__details">
            <span><Clock3 aria-hidden="true" />{time}</span>
            <span><Users aria-hidden="true" />Party of {reservation.partySize}</span>
            {reservation.table && <span><MapPin aria-hidden="true" />Table {reservation.table}</span>}
            {reservation.seatingPreference && <span><Utensils aria-hidden="true" />{reservation.seatingPreference}</span>}
          </div>
        </div>
        {(canCheckIn || canCancel) && (
          <div className="customer-record__actions">
            {canCheckIn && (
              <Button
                size="sm"
                variant="primary"
                isLoading={pending === 'checked_in'}
                disabled={Boolean(pending)}
                onClick={() => onStatusChange(reservation, 'checked_in')}
              >
                Check in
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                isLoading={pending === 'cancelled'}
                disabled={Boolean(pending)}
                onClick={() => onStatusChange(reservation, 'cancelled')}
              >
                Cancel reservation
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function CustomerDashboard() {
  const { user } = useRole();
  const {
    reservations,
    waitlist,
    loading,
    error,
    demoMode,
    refresh,
    refreshWaitlist,
    recommendReservation,
    createReservation,
    createWaitlistEntry,
    updateWaitlistStatus,
    updateReservationStatus,
  } = useOperationalData();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState(() => {
    const startsAt = new Date();
    startsAt.setHours(startsAt.getHours() + 1, 0, 0, 0);
    return { partySize: '2', startsAt: toLocalDateTimeValue(startsAt), seatingPreference: '', phone: '', notes: '' };
  });
  const [waitlistForm, setWaitlistForm] = useState({ partySize: '2' });
  const [bookingNotice, setBookingNotice] = useState(null);
  const [waitlistNotice, setWaitlistNotice] = useState(null);
  const [suggestedTable, setSuggestedTable] = useState(null);
  const [bookingPending, setBookingPending] = useState(false);
  const [waitlistPending, setWaitlistPending] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [pendingWaitlist, setPendingWaitlist] = useState(null);

  useEffect(() => {
    if (demoMode || waitlist.length === 0) return undefined;
    const interval = window.setInterval(() => { refreshWaitlist(); }, 30_000);
    return () => window.clearInterval(interval);
  }, [demoMode, refreshWaitlist, waitlist.length]);

  useEffect(() => {
    if (!showBookingForm) return;
    document.getElementById('customer-booking')?.scrollIntoView?.({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [showBookingForm]);

  const { upcoming, history } = useMemo(() => {
    const now = Date.now();
    const isHistory = (reservation) => (
      ['seated', 'cancelled', 'no_show'].includes(reservation.status)
      || (reservation.startsAt && new Date(reservation.startsAt).getTime() < now)
    );
    return {
      upcoming: reservations
        .filter((reservation) => !isHistory(reservation))
        .sort((a, b) => new Date(a.startsAt || 0) - new Date(b.startsAt || 0)),
      history: reservations
        .filter(isHistory)
        .sort((a, b) => new Date(b.startsAt || 0) - new Date(a.startsAt || 0)),
    };
  }, [reservations]);

  const handleBookingChange = (field, value) => {
    setSuggestedTable(null);
    setBookingNotice(null);
    setBookingForm((form) => ({ ...form, [field]: value }));
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    if (bookingPending) return;
    const startsAt = new Date(bookingForm.startsAt);
    const partySize = Number(bookingForm.partySize);
    if (!Number.isInteger(partySize) || partySize < 1) {
      setBookingNotice({ type: 'error', message: 'Enter a party size of at least one guest.' });
      return;
    }
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      setBookingNotice({ type: 'error', message: 'Choose a date and time in the future.' });
      return;
    }
    if (bookingForm.phone.length > 40 || bookingForm.notes.length > 500) {
      setBookingNotice({ type: 'error', message: 'Phone numbers can be up to 40 characters and notes up to 500 characters.' });
      return;
    }

    setBookingPending(true);
    setBookingNotice(null);
    const request = {
      partySize,
      startsAt: startsAt.toISOString(),
      seatingPreference: bookingForm.seatingPreference,
    };

    if (!suggestedTable) {
      const result = await recommendReservation(request);
      setBookingPending(false);
      if (!result.success) {
        setBookingNotice({ type: 'error', message: `No suitable table is available: ${result.error}` });
        return;
      }
      setSuggestedTable(result.data.recommendation);
      setBookingNotice({
        type: 'info',
        message: `${result.data.recommendation.name} is currently suggested for your party. Confirm to request this table; availability is checked again when saved.`,
      });
      return;
    }

    const result = await createReservation({
      ...request,
      tableId: suggestedTable.id,
      phone: bookingForm.phone.trim(),
      notes: bookingForm.notes.trim(),
    });
    setBookingPending(false);
    if (!result.success) {
      setBookingNotice({ type: 'error', message: `Reservation not placed: ${result.error}` });
      if (result.status === 409) setSuggestedTable(null);
      return;
    }
    const reservation = result.data.reservation;
    const confirmedTime = reservation.startsAt
      ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(reservation.startsAt))
      : reservation.time;
    setBookingNotice({ type: 'success', message: `Reservation confirmed for ${confirmedTime || formatReservationDate(reservation.startsAt)} at table ${reservation.table}.` });
    setSuggestedTable(null);
    setShowBookingForm(false);
  };

  const handleReservationStatus = async (reservation, status) => {
    if (pendingReservation) return;
    setPendingReservation({ id: reservation.id, status });
    setBookingNotice(null);
    const result = await updateReservationStatus(reservation.id, status);
    setPendingReservation(null);
    setBookingNotice(result.success
      ? { type: 'success', message: status === 'cancelled' ? 'Reservation cancelled.' : 'You are checked in. Please see the host stand.' }
      : { type: 'error', message: `Could not update reservation: ${result.error}` });
  };

  const handleJoinWaitlist = async (event) => {
    event.preventDefault();
    if (waitlistPending) return;
    const partySize = Number(waitlistForm.partySize);
    if (!Number.isInteger(partySize) || partySize < 1) {
      setWaitlistNotice({ type: 'error', message: 'Enter a party size of at least one guest.' });
      return;
    }
    setWaitlistPending(true);
    setWaitlistNotice(null);
    const result = await createWaitlistEntry({ partyName: user?.name, partySize });
    if (!result.success) {
      setWaitlistPending(false);
      setWaitlistNotice({ type: 'error', message: `Could not join the waitlist: ${result.error}` });
      return;
    }
    await refreshWaitlist();
    setWaitlistPending(false);
    setWaitlistNotice({ type: 'success', message: 'You have joined the walk-in waitlist.' });
  };

  const handleLeaveWaitlist = async (entry) => {
    if (pendingWaitlist) return;
    setPendingWaitlist(entry.id);
    setWaitlistNotice(null);
    const result = await updateWaitlistStatus(entry.id, 'cancelled');
    if (!result.success) {
      setPendingWaitlist(null);
      setWaitlistNotice({ type: 'error', message: `Could not leave the waitlist: ${result.error}` });
      return;
    }
    await refreshWaitlist();
    setPendingWaitlist(null);
    setWaitlistNotice({ type: 'success', message: 'You have left the waitlist.' });
  };

  return (
    <PageEntrance className="customer-dashboard">
      <section className="customer-welcome" aria-labelledby="customer-welcome-title">
        <div className="customer-welcome__ornament" aria-hidden="true" />
        <div className="customer-welcome__content">
          <p className="customer-eyebrow">A more considered evening</p>
          <h1 id="customer-welcome-title">Welcome back, {user?.name || 'Dining Guest'}</h1>
          <p className="customer-welcome__copy">Plan your visit, keep your reservations close, and arrive ready to enjoy the table.</p>
          {demoMode && <span className="customer-demo-label">Preview data · changes are temporary</span>}
        </div>
        <Button
          size="lg"
          variant="accent"
          icon={Plus}
          onClick={() => {
            setShowBookingForm((open) => !open);
            setBookingNotice(null);
          }}
        >
          {showBookingForm ? 'Close reservation form' : 'Reserve a Table'}
        </Button>
      </section>

      <OperationalDataStatus loading={loading} error={error} onRetry={refresh} />

      {showBookingForm && (
        <Card id="customer-booking" className="customer-panel customer-booking-panel">
          <div className="customer-panel__heading">
            <span className="customer-section-icon"><CalendarDays aria-hidden="true" /></span>
            <div>
              <p className="customer-eyebrow">Your next visit</p>
              <h2>Make a reservation</h2>
              <p>Choose a future date and party size. We’ll check current table availability before confirming.</p>
            </div>
          </div>
          <CardContent className="pt-0">
            <form onSubmit={handleBookingSubmit} className="customer-form">
              <label className="customer-field">
                <span>Party size</span>
                <input type="number" min="1" step="1" inputMode="numeric" value={bookingForm.partySize} onChange={(event) => handleBookingChange('partySize', event.target.value)} required />
              </label>
              <label className="customer-field">
                <span>Date and time</span>
                <input type="datetime-local" min={toLocalDateTimeValue(new Date())} value={bookingForm.startsAt} onChange={(event) => handleBookingChange('startsAt', event.target.value)} required />
              </label>
              <label className="customer-field">
                <span>Seating preference <small>Optional</small></span>
                <select value={bookingForm.seatingPreference} onChange={(event) => handleBookingChange('seatingPreference', event.target.value)}>
                  <option value="">No preference</option>
                  <option value="Window Patio">Window Patio</option>
                  <option value="Main Dining Hall">Main Dining Hall</option>
                  <option value="Central Booths">Central Booths</option>
                  <option value="Private Alcove">Private Alcove</option>
                </select>
              </label>
              <label className="customer-field">
                <span>Phone <small>Optional</small></span>
                <input type="tel" autoComplete="tel" maxLength="40" value={bookingForm.phone} onChange={(event) => handleBookingChange('phone', event.target.value)} placeholder="For reservation updates" />
              </label>
              <label className="customer-field customer-field--wide">
                <span>Notes <small>Optional</small></span>
                <textarea rows="3" maxLength="500" value={bookingForm.notes} onChange={(event) => handleBookingChange('notes', event.target.value)} placeholder="Anything the host should know?" />
              </label>
              <div className="customer-form__submit">
                <Button type="submit" variant="primary" size="lg" icon={bookingPending ? LoaderCircle : suggestedTable ? CheckCircle2 : TicketCheck} isLoading={bookingPending}>
          {suggestedTable ? `Confirm ${suggestedTable.name}` : 'Find a Table'}
                </Button>
              </div>
            </form>
            {suggestedTable && (
              <div className="customer-suggestion" role="note">
                <CheckCircle2 aria-hidden="true" />
                <span>Suggested table: <strong>{suggestedTable.name}</strong> · {suggestedTable.capacity} seats · {suggestedTable.section}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {bookingNotice && <Notice notice={bookingNotice} onDismiss={() => setBookingNotice(null)} />}

      <section className="customer-section" aria-labelledby="customer-upcoming-title">
        <SectionHeading id="customer-upcoming-title" eyebrow="Reserved for you" title="Upcoming reservations" icon={TicketCheck} />
        {loading && reservations.length === 0 ? (
          <LoadingPanel label="Loading your reservations" />
        ) : upcoming.length ? (
          <div className="customer-record-list">
            {upcoming.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onStatusChange={handleReservationStatus}
                pending={pendingReservation?.id === reservation.id ? pendingReservation.status : null}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel
            icon={CalendarDays}
            title="No upcoming reservations"
            description="When you reserve a table, the date, time, party details and current status will appear here."
            action={<Button variant="secondary" onClick={() => setShowBookingForm(true)}>Plan a visit</Button>}
          />
        )}
      </section>

      <section className="customer-panel customer-waitlist" aria-labelledby="customer-waitlist-title">
        <div className="customer-panel__heading customer-panel__heading--spread">
          <span className="customer-section-icon"><Users aria-hidden="true" /></span>
          <div className="customer-panel__title-group">
            <p className="customer-eyebrow">For a spontaneous visit</p>
            <h2 id="customer-waitlist-title">Walk-in waitlist</h2>
            <p>Join the restaurant’s arrival queue for your party. Queue position is shown only when returned by the service.</p>
          </div>
          <form className="customer-waitlist__join" onSubmit={handleJoinWaitlist}>
            <label className="customer-field customer-field--compact">
              <span>Guests</span>
              <input type="number" min="1" step="1" inputMode="numeric" value={waitlistForm.partySize} onChange={(event) => setWaitlistForm({ partySize: event.target.value })} required />
            </label>
            <Button type="submit" variant="primary" isLoading={waitlistPending || (loading && waitlist.length === 0)} disabled={loading || waitlistPending || waitlist.length > 0}>
              {waitlist.length ? 'On the list' : loading ? 'Checking status' : 'Join waitlist'}
            </Button>
          </form>
        </div>
        {waitlistNotice && <Notice notice={waitlistNotice} onDismiss={() => setWaitlistNotice(null)} />}
        {loading && waitlist.length === 0 ? (
          <LoadingPanel label="Checking your waitlist status" />
        ) : waitlist.length ? (
          <div className="customer-waitlist__entries">
            {waitlist.map((entry) => (
              <div className="customer-waitlist-entry" key={entry.id}>
                <div className="customer-waitlist-entry__mark"><PartyPopper aria-hidden="true" /></div>
                <div className="customer-waitlist-entry__main">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>Party of {entry.partySize}</strong>
                    <Badge variant={getStatusStyle(entry.status)} dot>{String(entry.status || 'waiting').replaceAll('_', ' ')}</Badge>
                  </div>
                  <p>
                    {Number.isInteger(entry.position) ? `Queue position ${entry.position}` : 'Queue position not provided'}
                    {Number.isFinite(entry.waitMinutes) ? ` · Waiting ${entry.waitMinutes} min` : ''}
                    {Number.isFinite(entry.quotedWait) ? ` · Estimated ${entry.quotedWait} min` : ' · No wait-time estimate available'}
                  </p>
                </div>
                <Button size="sm" variant="outline" isLoading={pendingWaitlist === entry.id} disabled={Boolean(pendingWaitlist) || !['waiting', 'ready'].includes(entry.status)} onClick={() => handleLeaveWaitlist(entry)}>
                  Leave waitlist
                </Button>
              </div>
            ))}
            <button type="button" className="customer-refresh" onClick={refreshWaitlist} aria-label="Refresh waitlist status">
              <RefreshCw aria-hidden="true" /> Refresh status
            </button>
          </div>
        ) : (
          <p className="customer-waitlist__empty"><span><Check aria-hidden="true" /></span>You’re not currently on the waitlist.</p>
        )}
      </section>

      <section className="customer-section customer-history" aria-labelledby="customer-history-title">
        <SectionHeading id="customer-history-title" eyebrow="Your visits" title="Dining history" icon={History} />
        {history.length ? (
          <div className="customer-record-list">
            {history.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} onStatusChange={handleReservationStatus} pending={null} />)}
          </div>
        ) : (
          <EmptyPanel
            icon={History}
            title="Your dining history will appear here"
            description="Past visits and completed reservations are listed here as they’re returned by the restaurant service."
          />
        )}
      </section>
    </PageEntrance>
  );
}

function SectionHeading({ id, eyebrow, title, icon: Icon }) {
  return (
    <div className="customer-section-heading">
      <span className="customer-section-heading__icon"><Icon aria-hidden="true" /></span>
      <div><p className="customer-eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2></div>
    </div>
  );
}

function Notice({ notice, onDismiss }) {
  return (
    <div className={`customer-notice customer-notice--${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'} aria-live="polite">
      {notice.type === 'success' ? <CheckCircle2 aria-hidden="true" /> : notice.type === 'error' ? <X aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <span>{notice.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message"><X aria-hidden="true" /></button>
    </div>
  );
}

function LoadingPanel({ label }) {
  return <div className="customer-loading" role="status"><LoaderCircle aria-hidden="true" />{label}</div>;
}

function EmptyPanel({ icon: Icon, title, description, action }) {
  return (
    <div className="customer-empty">
      <span><Icon aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export default CustomerDashboard;
