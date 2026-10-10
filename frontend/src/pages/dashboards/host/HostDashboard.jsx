import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { useOperationalData } from '../../../hooks/useOperationalData';
import { recommendTable } from '../../../services/allocation';
import {
  UserPlus,
  Clock,
  CheckCircle,
  Sparkles,
  Armchair,
} from 'lucide-react';

export function HostDashboard() {
  const {
    tables,
    reservations,
    waitlist: walkIns,
    loading,
    error,
    refresh,
    createWaitlistEntry,
    seatWaitlistEntry,
    seatReservation,
    updateReservationStatus,
  } = useOperationalData();
  const [actionNotice, setActionNotice] = useState(null);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ partyName: '', partySize: '2', contact: '' });

  const canSeat = (partySize) => tables.filter((table) =>
    recommendTable({ tables: [table], reservations, partySize }).table
  );
  const availableTwoTops = canSeat(2).filter((table) => table.capacity === 2).length;
  const availableFourTops = canSeat(4).filter((table) => table.capacity === 4).length;
  const availableSixPlus = canSeat(6).filter((table) => table.capacity >= 6).length;
  const activeReservations = reservations.filter((res) => !['seated', 'cancelled', 'no_show'].includes(res.status));
  const orderedWalkIns = [...walkIns].sort((left, right) => {
    if (left.createdAt && right.createdAt) return new Date(left.createdAt) - new Date(right.createdAt);
    return (right.waitMinutes || 0) - (left.waitMinutes || 0);
  });

  const handleSeatReservation = async (reservation) => {
    const result = await seatReservation(reservation.id);
    setActionNotice(result.success
      ? `Seated ${reservation.guestName} at ${result.data.table?.id || reservation.table}.`
      : `Could not seat ${reservation.guestName}: ${result.error}`);
  };

  const handleSeatWalkIn = async (entry) => {
    const result = await seatWaitlistEntry(entry.id);
    setActionNotice(result.success
      ? `Seated ${entry.partyName} at ${result.data.table.id}.`
      : `Could not seat ${entry.partyName}: ${result.error}`);
  };

  const handleWalkInSubmit = async (event) => {
    event.preventDefault();
    const partySize = Number(walkInForm.partySize);
    if (!walkInForm.partyName.trim() || !Number.isInteger(partySize) || partySize < 1) return;
    const result = await createWaitlistEntry({
      partyName: walkInForm.partyName.trim(),
      partySize,
      contact: walkInForm.contact.trim(),
    });
    if (!result.success) {
      setActionNotice(`Could not add ${walkInForm.partyName.trim()}: ${result.error}`);
      return;
    }
    setActionNotice(`${walkInForm.partyName.trim()} was added to the waitlist.`);
    setWalkInForm({ partyName: '', partySize: '2', contact: '' });
    setShowWalkInForm(false);
  };

  const handleNoShow = async (reservation) => {
    const result = await updateReservationStatus(reservation.id, 'no_show');
    setActionNotice(result.success
      ? `${reservation.guestName} was marked as a no-show.`
      : `Could not update reservation: ${result.error}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header and Quick CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Host Stand & Seating Desk
            </h2>
            <Badge variant="teal" size="sm">Front-of-House</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Register walk-ins, sequence the current queue, and seat parties using capacity and reservation checks.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowWalkInForm((isOpen) => !isOpen)}
            icon={UserPlus}
          >
            {showWalkInForm ? 'Close Walk-In Form' : 'Add Walk-In'}
          </Button>
        </div>
      </div>

      {(loading || error) && (
        <div role={error ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white text-slate-600'}`}>
          {loading ? 'Loading restaurant data…' : error}
          {error && <button type="button" className="ml-3 font-semibold underline" onClick={refresh}>Retry</button>}
        </div>
      )}

      {showWalkInForm && (
        <Card>
          <CardHeader>
            <CardTitle>Register a Walk-In Party</CardTitle>
            <CardDescription>Add the party to the queue. A wait time is shown only when supported by service data.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWalkInSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
              <Input
                label="Party name"
                value={walkInForm.partyName}
                onChange={(event) => setWalkInForm((form) => ({ ...form, partyName: event.target.value }))}
                placeholder="e.g. The Garcia party"
                required
                maxLength={120}
              />
              <Input
                label="Guests"
                type="number"
                min="1"
                max="30"
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
              />
              <Button type="submit" variant="accent" icon={UserPlus}>Add to Queue</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {actionNotice && (
        <div role="status" className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-teal-700 hover:text-teal-900 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Seating Availability Summary Cards */}
      <div id="availability" className="grid grid-cols-1 sm:grid-cols-3 gap-4 scroll-mt-24">
        <StatCard
          title="Available 2-Guest Tables"
          value={availableTwoTops}
          subtitle="Window & Chef Counter"
          icon={Armchair}
          accentColor="teal"
        />
        <StatCard
          title="Available 4-Guest Tables"
          value={availableFourTops}
          subtitle="Main Hall & Booths"
          icon={Armchair}
          accentColor="cyan"
        />
        <StatCard
          title="Open Large (6-8p) Tables"
          value={availableSixPlus}
          subtitle="Private Alcove available"
          icon={Armchair}
          accentColor="amber"
        />
      </div>

      {/* 2 Columns: Today's Reservations & Walk-In Waitlist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Reservations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card id="reservations" className="scroll-mt-24">
            <CardHeader
              action={
                <Badge variant="teal" size="sm">
                  {reservations.length} Bookings
                </Badge>
              }
            >
              <CardTitle>Evening Reservations Schedule</CardTitle>
              <CardDescription>
                Confirmed and checked-in bookings, with table assignments protected by the allocation rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {activeReservations.length ? <div className="divide-y divide-slate-100">
                {activeReservations.map((res) => (
                  <div key={res.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-occupie-navy-900 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                        <span className="text-xs font-bold leading-none">{res.time || (res.startsAt ? new Date(res.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}</span>
                        <span className="text-[9px] text-occupie-teal-400 uppercase mt-0.5">Time</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{res.guestName}</span>
                          <span className="text-xs text-slate-400">&bull;</span>
                          <span className="text-xs font-semibold text-slate-600">Party of {res.partySize}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Target: <strong className="text-slate-800">{res.table}</strong></span>
                          <span>&bull;</span>
                          <span className="text-slate-400">{res.phone}</span>
                        </div>
                        {res.notes && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1.5 inline-block border border-amber-200/50">
                            {res.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button size="sm" variant="secondary" onClick={() => handleSeatReservation(res)}>
                        Seat Guest
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleNoShow(res)}>
                        No-show
                      </Button>
                    </div>
                  </div>
                ))}
              </div> : <EmptyState title="No upcoming reservations" description="New reservations will appear here when they are created." />}
            </CardContent>
          </Card>
        </div>

        {/* Walk-In Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card id="waitlist" className="scroll-mt-24">
            <CardHeader
              action={
                <span className="text-xs font-semibold text-slate-500">
                  {orderedWalkIns.length} In Queue
                </span>
              }
            >
              <CardTitle>Current Walk-In Waitlist</CardTitle>
              <CardDescription>
                Guests waiting on-site for next available table.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {orderedWalkIns.length ? <div className="divide-y divide-slate-100">
                {orderedWalkIns.map((item, idx) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{item.partyName}</p>
                          <span className="text-[10px] text-slate-400">({item.partySize}p)</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Waiting {item.waitMinutes}m &bull; {item.quotedWait ? `Demo estimate ${item.quotedWait}` : 'No wait estimate'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={item.status === 'ready' ? 'accent' : 'secondary'}
                        className="text-xs py-1 px-2.5"
                        onClick={() => handleSeatWalkIn(item)}
                      >
                        {item.status === 'ready' ? 'Table Ready' : 'Allocate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div> : <EmptyState title="The waitlist is clear" description="Add a walk-in party to keep the queue in order." actionLabel="Add a walk-in" onAction={() => setShowWalkInForm(true)} />}
            </CardContent>
          </Card>

          {/* Seating Recommendation Preview Box */}
          <Card className="bg-gradient-to-br from-slate-900 to-occupie-navy-950 text-white border-occupie-navy-800">
            <CardContent className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-occupie-teal-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Allocation Rule
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Occupie considers available tables that fit the party, protects confirmed reservation windows, and recommends the smallest suitable table. It does not predict when an occupied table will clear.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default HostDashboard;
