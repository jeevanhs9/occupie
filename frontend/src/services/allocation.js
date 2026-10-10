const DEFAULT_RESERVATION_HOLD_MINUTES = 90;

function minutesFromTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && value.includes('T')) {
    return parsed.getHours() * 60 + parsed.getMinutes();
  }

  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesUntil(a, b) {
  const direct = Math.abs(a - b);
  return Math.min(direct, 1440 - direct);
}

/**
 * Pick the smallest suitable available table while protecting nearby bookings.
 * This transparent preview rule does not predict table turnover or promise a wait.
 */
export function recommendTable({
  tables = [],
  reservations = [],
  partySize,
  at = new Date(),
  preferredSection,
  reservationHoldMinutes = DEFAULT_RESERVATION_HOLD_MINUTES,
}) {
  if (!Number.isInteger(partySize) || partySize < 1) {
    return { table: null, reason: 'Enter a party size greater than zero.' };
  }

  const requestedMinutes = at instanceof Date
    ? at.getHours() * 60 + at.getMinutes()
    : minutesFromTime(at, new Date());

  const candidates = tables.filter((table) => {
    if (table.status !== 'available' || table.capacity < partySize) return false;

    const reservationConflict = reservations.some((reservation) => {
      const active = !['cancelled', 'no_show', 'seated'].includes(String(reservation.status || '').toLowerCase());
      if (!active || reservation.table !== table.id) return false;
      const reservedMinutes = minutesFromTime(reservation.startsAt || reservation.time);
      return reservedMinutes !== null
        && minutesUntil(requestedMinutes, reservedMinutes) < reservationHoldMinutes;
    });

    return !reservationConflict;
  });

  candidates.sort((left, right) =>
    (Number(Boolean(preferredSection && right.section?.toLowerCase() === preferredSection.toLowerCase()))
      - Number(Boolean(preferredSection && left.section?.toLowerCase() === preferredSection.toLowerCase())))
      || (left.capacity - partySize) - (right.capacity - partySize)
      || String(left.id).localeCompare(String(right.id), undefined, { numeric: true })
  );

  return candidates.length
    ? { table: candidates[0], reason: 'Smallest suitable available table; reservation holds were checked.' }
    : { table: null, reason: 'No suitable table is available right now. Occupied-table turnover is not predicted.' };
}

export function nextSeatableWaitlistEntry({ waitlist = [], tables = [], reservations = [], at = new Date() }) {
  const orderedQueue = [...waitlist]
    .filter((entry) => ['waiting', 'ready'].includes(entry.status))
    .sort((left, right) => {
      const leftCreated = left.createdAt ? new Date(left.createdAt).getTime() : null;
      const rightCreated = right.createdAt ? new Date(right.createdAt).getTime() : null;
      if (leftCreated !== null && rightCreated !== null && leftCreated !== rightCreated) return leftCreated - rightCreated;
      return (right.waitMinutes || 0) - (left.waitMinutes || 0) || String(left.id).localeCompare(String(right.id));
    });

  for (const entry of orderedQueue) {
    const recommendation = recommendTable({ tables, reservations, partySize: entry.partySize, at });
    if (recommendation.table) return { entry, ...recommendation };
  }
  return { entry: null, table: null, reason: 'No suitable table is available for any party in the queue.' };
}

