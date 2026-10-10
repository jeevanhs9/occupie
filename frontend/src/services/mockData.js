/**
 * Occupie Central Mock Data Layer (Phase 1)
 * Clearly labeled mock fixtures to allow realistic UI preview
 * before Phase 2 database & algorithm integration.
 */

export const MOCK_RESTAURANT_INFO = {
  name: 'L’Atelier Bistro & Bar',
  type: 'Contemporary Casual Dining',
  totalTables: 16,
  totalCapacity: 64,
  currentOccupancyRate: 78,
  activeCovers: 48,
  reservationsTodayCount: 28,
  avgTurnaroundMinutes: 52,
};

export const MOCK_TABLES = [
  { id: 'T01', name: 'Table 1', capacity: 2, section: 'Window Patio', status: 'occupied', assignedServer: 'Marco R.', serverId: 'S1', partySize: 2, timeSeated: '18:45' },
  { id: 'T02', name: 'Table 2', capacity: 2, section: 'Window Patio', status: 'cleaning', assignedServer: 'Marco R.', serverId: 'S1', partySize: 0, timeSeated: null },
  { id: 'T03', name: 'Table 3', capacity: 4, section: 'Window Patio', status: 'available', assignedServer: 'Marco R.', serverId: 'S1', partySize: 0, timeSeated: null },
  { id: 'T04', name: 'Table 4', capacity: 4, section: 'Window Patio', status: 'reserved', assignedServer: 'Marco R.', serverId: 'S1', partySize: 4, timeSeated: null },

  { id: 'T05', name: 'Table 5', capacity: 4, section: 'Main Dining Hall', status: 'occupied', assignedServer: 'Sarah T.', serverId: 'S2', partySize: 3, timeSeated: '19:00' },
  { id: 'T06', name: 'Table 6', capacity: 4, section: 'Main Dining Hall', status: 'occupied', assignedServer: 'Sarah T.', serverId: 'S2', partySize: 4, timeSeated: '19:15' },
  { id: 'T07', name: 'Table 7', capacity: 6, section: 'Main Dining Hall', status: 'occupied', assignedServer: 'Sarah T.', serverId: 'S2', partySize: 6, timeSeated: '18:30' },
  { id: 'T08', name: 'Table 8', capacity: 6, section: 'Main Dining Hall', status: 'reserved', assignedServer: 'Sarah T.', serverId: 'S2', partySize: 5, timeSeated: null },

  { id: 'T09', name: 'Table 9', capacity: 2, section: 'Central Booths', status: 'occupied', assignedServer: 'Elena K.', serverId: 'S3', partySize: 2, timeSeated: '19:20' },
  { id: 'T10', name: 'Table 10', capacity: 2, section: 'Central Booths', status: 'available', assignedServer: 'Elena K.', serverId: 'S3', partySize: 0, timeSeated: null },
  { id: 'T11', name: 'Table 11', capacity: 4, section: 'Central Booths', status: 'cleaning', assignedServer: 'Elena K.', serverId: 'S3', partySize: 0, timeSeated: null },
  { id: 'T12', name: 'Table 12', capacity: 4, section: 'Central Booths', status: 'occupied', assignedServer: 'Elena K.', serverId: 'S3', partySize: 4, timeSeated: '19:05' },

  { id: 'T13', name: 'Table 13', capacity: 8, section: 'Private Alcove', status: 'reserved', assignedServer: 'Marco R.', serverId: 'S1', partySize: 8, timeSeated: null },
  { id: 'T14', name: 'Table 14', capacity: 6, section: 'Private Alcove', status: 'available', assignedServer: 'Sarah T.', serverId: 'S2', partySize: 0, timeSeated: null },
  { id: 'T15', name: 'Table 15', capacity: 2, section: 'Chef Counter', status: 'occupied', assignedServer: 'Elena K.', serverId: 'S3', partySize: 2, timeSeated: '19:30' },
  { id: 'T16', name: 'Table 16', capacity: 2, section: 'Chef Counter', status: 'available', assignedServer: 'Elena K.', serverId: 'S3', partySize: 0, timeSeated: null },
];

export const MOCK_RESERVATIONS = [
  { id: 'RES-101', guestName: 'Victoria Sterling', partySize: 4, time: '19:30', table: 'T04', status: 'confirmed', phone: '+1 (555) 234-5678', notes: 'Anniversary celebration. Prefer quiet corner.' },
  { id: 'RES-102', guestName: 'Dr. Michael Chen', partySize: 5, time: '19:45', table: 'T08', status: 'confirmed', phone: '+1 (555) 345-6789', notes: '1 guest requires gluten-free options.' },
  { id: 'RES-103', guestName: 'Amara Vance', partySize: 8, time: '20:15', table: 'T13', status: 'confirmed', phone: '+1 (555) 456-7890', notes: 'Corporate dinner. Pre-selected wine tasting.' },
  { id: 'RES-104', guestName: 'Liam & Olivia Ross', partySize: 2, time: '20:30', table: 'T10', status: 'confirmed', phone: '+1 (555) 567-8901', notes: 'First time guests.' },
  { id: 'RES-105', guestName: 'Julian Mercer', partySize: 4, time: '20:45', table: 'T12', status: 'confirmed', phone: '+1 (555) 678-9012', notes: 'Window preference.' },
];

export const MOCK_WALK_INS = [
  { id: 'WL-01', partyName: 'Gomez Party', partySize: 2, waitMinutes: 12, quotedWait: '15-20 min', status: 'waiting', contact: '+1 (555) 890-1234' },
  { id: 'WL-02', partyName: 'Kowalski Family', partySize: 4, waitMinutes: 24, quotedWait: '25-30 min', status: 'waiting', contact: '+1 (555) 901-2345' },
  { id: 'WL-03', partyName: 'Takahashi & Guest', partySize: 2, waitMinutes: 8, quotedWait: '10-15 min', status: 'ready', contact: '+1 (555) 012-3456' },
  { id: 'WL-04', partyName: 'Patel Group', partySize: 6, waitMinutes: 35, quotedWait: '35-40 min', status: 'waiting', contact: '+1 (555) 123-4567' },
];

export const MOCK_HOURLY_OCCUPANCY = [
  { time: '16:00', occupancy: 20, reservations: 4 },
  { time: '17:00', occupancy: 42, reservations: 10 },
  { time: '18:00', occupancy: 68, reservations: 18 },
  { time: '19:00', occupancy: 88, reservations: 24 },
  { time: '20:00', occupancy: 94, reservations: 28 },
  { time: '21:00', occupancy: 75, reservations: 20 },
  { time: '22:00', occupancy: 45, reservations: 8 },
];

export const MOCK_CUSTOMER_UPCOMING = [
  {
    id: 'MY-RES-889',
    restaurantName: 'L’Atelier Bistro & Bar',
    date: 'Tonight, Oct 10, 2026',
    time: '20:00',
    partySize: 2,
    tablePreference: 'Window Patio / Booth',
    status: 'Confirmed',
    confirmationCode: 'OCP-8892',
    address: '428 Culinary Way, Downtown District',
  }
];
