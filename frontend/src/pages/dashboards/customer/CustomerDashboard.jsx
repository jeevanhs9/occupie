import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { OperationalDataStatus } from '../../../components/common/OperationalDataStatus';
import { useOperationalData } from '../../../hooks/useOperationalData';
import { useRole } from '../../../hooks/useRole';
import { MOCK_RESTAURANT_INFO } from '../../../services/mockData';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  PlusCircle,
  Ticket,
  Utensils,
  History,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

function toLocalDateTimeValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CustomerDashboard() {
  const { user } = useRole();
  const {
    reservations,
    loading,
    error,
    refresh,
    recommendReservation,
    createReservation,
    updateReservationStatus,
  } = useOperationalData();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState(() => {
    const startsAt = new Date();
    startsAt.setHours(startsAt.getHours() + 1, 0, 0, 0);
    return { partySize: '2', startsAt: toLocalDateTimeValue(startsAt), seatingPreference: '' };
  });
  const [bookingNotice, setBookingNotice] = useState(null);
  const [suggestedTable, setSuggestedTable] = useState(null);

  const upcoming = reservations.filter((reservation) =>
    reservation.guestName === user?.name
      && !['seated', 'cancelled', 'no_show'].includes(reservation.status)
  );

  const handleBookTable = () => setShowBookingForm(true);

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    const startsAt = new Date(bookingForm.startsAt);
    const partySize = Number(bookingForm.partySize);
    if (!Number.isInteger(partySize) || partySize < 1 || Number.isNaN(startsAt.getTime())) return;
    const request = {
      guestName: user?.name || 'Dining Guest',
      partySize,
      startsAt: startsAt.toISOString(),
      seatingPreference: bookingForm.seatingPreference,
    };
    if (!suggestedTable) {
      const recommendation = await recommendReservation(request);
      if (!recommendation.success) {
        setBookingNotice(`No table recommendation: ${recommendation.error}`);
        return;
      }
      setSuggestedTable(recommendation.data.recommendation);
      setBookingNotice(`Suggested ${recommendation.data.recommendation.name} in ${recommendation.data.recommendation.section}. Review the suggestion, then confirm.`);
      return;
    }

    const result = await createReservation({ ...request, tableId: suggestedTable.id });
    if (!result.success) {
      setBookingNotice(`Reservation not placed: ${result.error}`);
      if (result.status === 409) setSuggestedTable(null);
      return;
    }
    const reservation = result.data.reservation;
    setBookingNotice(`Reservation confirmed for ${reservation.time} at ${reservation.table}.`);
    setSuggestedTable(null);
    setShowBookingForm(false);
  };

  const handleReservationStatus = async (reservation, status) => {
    const result = await updateReservationStatus(reservation.id, status);
    setBookingNotice(result.success
      ? (status === 'cancelled' ? 'Reservation cancelled.' : 'You are checked in. Please see the host stand.')
      : `Could not update reservation: ${result.error}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-occupie-burgundy-950 via-occupie-walnut-900 to-occupie-walnut-950 text-white p-6 sm:p-8 relative overflow-hidden border border-occupie-burgundy-800 shadow-lg">
        <div className="absolute right-0 top-0 w-96 h-96 bg-occupie-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="teal" size="sm">
              Occupie Dining Rewards
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.name || 'Dining Guest'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
              Manage your booking at L’Atelier Bistro & Bar. Wait time estimates appear only when current restaurant data supports them.
            </p>
          </div>

          <div id="booking" className="shrink-0 scroll-mt-24">
            <Button
              size="lg"
              variant="accent"
              onClick={() => setShowBookingForm((isOpen) => !isOpen)}
              icon={PlusCircle}
            >
              {showBookingForm ? 'Close Booking Form' : 'Reserve a Table'}
            </Button>
          </div>
        </div>
      </div>

      <OperationalDataStatus loading={loading} error={error} onRetry={refresh} />

      {showBookingForm && (
        <Card>
          <CardHeader>
            <CardTitle>Reserve a Table</CardTitle>
            <CardDescription>Choose a future time and party size. Occupie checks availability and suggests a table before confirming the reservation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
              <Input
                label="Guests"
                type="number"
                min="1"
                max="30"
                value={bookingForm.partySize}
                onChange={(event) => {
                  setSuggestedTable(null);
                  setBookingForm((form) => ({ ...form, partySize: event.target.value }));
                }}
                required
              />
              <Input
                label="Preferred date and time"
                type="datetime-local"
                min={toLocalDateTimeValue(new Date())}
                value={bookingForm.startsAt}
                onChange={(event) => {
                  setSuggestedTable(null);
                  setBookingForm((form) => ({ ...form, startsAt: event.target.value }));
                }}
                required
              />
              <label className="w-full space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Seating preference</span>
                <select
                  value={bookingForm.seatingPreference}
                  onChange={(event) => {
                    setSuggestedTable(null);
                    setBookingForm((form) => ({ ...form, seatingPreference: event.target.value }));
                  }}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-occupie-cyan-500 focus:outline-none focus:ring-2 focus:ring-occupie-cyan-500/30"
                >
                  <option value="">No preference</option>
                  <option value="Window Patio">Window Patio</option>
                  <option value="Main Dining Hall">Main Dining Hall</option>
                  <option value="Central Booths">Central Booths</option>
                  <option value="Private Alcove">Private Alcove</option>
                </select>
              </label>
              <Button type="submit" variant="accent" icon={suggestedTable ? CheckCircle2 : PlusCircle}>
                {suggestedTable ? `Confirm ${suggestedTable.name}` : 'Find a Table'}
              </Button>
            </form>
            {suggestedTable && (
              <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950" role="status">
                Suggested table: <strong>{suggestedTable.name}</strong> · {suggestedTable.capacity} seats · {suggestedTable.section}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {bookingNotice && (
        <div role="status" className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>{bookingNotice}</span>
          </div>
          <button type="button" aria-label="Dismiss notice" onClick={() => setBookingNotice(null)} className="text-sky-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Upcoming Reservation Section */}
      <div id="upcoming" className="space-y-4 scroll-mt-24">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-occupie-teal-500" />
            Your Upcoming Dining Reservation
          </h3>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {upcoming.map((res) => (
              <Card key={res.id} className="overflow-hidden border-slate-200/90 shadow-sm">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-white via-slate-50/50 to-white">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm" dot={true}>
                        {res.status}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {res.confirmationCode || res.id}
                      </span>
                    </div>

                    <h4 className="text-xl font-bold text-slate-900">{res.restaurantName || MOCK_RESTAURANT_INFO.name}</h4>

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{res.date || (res.startsAt ? new Date(res.startsAt).toLocaleDateString() : 'Today')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{res.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Party of {res.partySize} guests</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{res.seatingPreference || `Table ${res.table}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleReservationStatus(res, 'cancelled')}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="primary" disabled={res.status === 'checked_in'} onClick={() => handleReservationStatus(res, 'checked_in')}>
                      {res.status === 'checked_in' ? 'Checked In' : 'Check In'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Upcoming Reservations"
            description="You don’t have any active bookings right now. Reserve a table tonight to experience modern casual dining."
            actionLabel="Make a Reservation"
            onAction={handleBookTable}
          />
        )}
      </div>

      {/* Reservation History Section (Demonstrating Reusable Empty State) */}
      <div id="history" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          Dining History
        </h3>

        <EmptyState
          title="No Prior Dining History Yet"
          description="Completed visits, chef tasting notes, and past receipts will appear here after your first completed reservation."
          icon={History}
          actionLabel="Browse Available Dining Times"
          onAction={handleBookTable}
        />
      </div>
    </div>
  );
}

export default CustomerDashboard;
