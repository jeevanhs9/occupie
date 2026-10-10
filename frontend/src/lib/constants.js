export const ROLES = {
  MANAGER: 'manager',
  HOST: 'host',
  FLOOR_STAFF: 'floor_staff',
  CUSTOMER: 'customer',
};

export const ROLE_CONFIGS = {
  [ROLES.MANAGER]: {
    id: ROLES.MANAGER,
    title: 'Restaurant Manager',
    badge: 'Admin & Operations',
    description: 'Review table use, reservations, shift data, and service alerts.',
    route: '/dashboard/manager',
    color: 'from-blue-600 to-indigo-700',
    icon: 'ShieldCheck',
  },
  [ROLES.HOST]: {
    id: ROLES.HOST,
    title: 'Receptionist / Host',
    badge: 'Front-of-House',
    description: 'Manage reservations, orchestrate walk-in queues, and get optimal table seating recommendations.',
    route: '/dashboard/host',
    color: 'from-teal-600 to-cyan-700',
    icon: 'UserCheck',
  },
  [ROLES.FLOOR_STAFF]: {
    id: ROLES.FLOOR_STAFF,
    title: 'Floor Staff',
    badge: 'Service & Dining Room',
    description: 'Update table service status and monitor an assigned station.',
    route: '/dashboard/floor-staff',
    color: 'from-amber-500 to-orange-600',
    icon: 'UtensilsCrossed',
  },
  [ROLES.CUSTOMER]: {
    id: ROLES.CUSTOMER,
    title: 'Customer',
    badge: 'Guest Portal',
    description: 'Create, review, check in to, or cancel restaurant reservations.',
    route: '/dashboard/customer',
    color: 'from-emerald-600 to-teal-700',
    icon: 'CalendarCheck',
  },
};

export const TABLE_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  CLEANING: 'cleaning',
};

export const TABLE_STATUS_CONFIG = {
  [TABLE_STATUS.AVAILABLE]: {
    label: 'Available',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  [TABLE_STATUS.OCCUPIED]: {
    label: 'Occupied',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
  [TABLE_STATUS.RESERVED]: {
    label: 'Reserved',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  [TABLE_STATUS.CLEANING]: {
    label: 'Cleaning',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    dotClass: 'bg-sky-500',
  },
};

export const ROLE_NAVIGATION = {
  [ROLES.MANAGER]: [
    { label: 'Overview', path: '/dashboard/manager', icon: 'LayoutDashboard' },
    { label: 'Table Management', path: '/dashboard/manager#tables', icon: 'Grid' },
    { label: 'Reservations', path: '/dashboard/manager#reservations', icon: 'Calendar' },
    { label: 'Reports & Alerts', path: '/dashboard/manager#reports', icon: 'BarChart3' },
  ],
  [ROLES.HOST]: [
    { label: 'Host Stand', path: '/dashboard/host', icon: 'CalendarCheck' },
    { label: 'Reservations', path: '/dashboard/host#reservations', icon: 'Clock' },
    { label: 'Walk-In Waitlist', path: '/dashboard/host#waitlist', icon: 'ListOrdered' },
    { label: 'Table Availability', path: '/dashboard/host#availability', icon: 'LayoutGrid' },
  ],
  [ROLES.FLOOR_STAFF]: [
    { label: 'Floor Status', path: '/dashboard/floor-staff', icon: 'Activity' },
    { label: 'My Assigned Tables', path: '/dashboard/floor-staff#tables', icon: 'Armchair' },
  ],
  [ROLES.CUSTOMER]: [
    { label: 'My Dining Hub', path: '/dashboard/customer', icon: 'Utensils' },
    { label: 'Book a Table', path: '/dashboard/customer/book', icon: 'PlusCircle' },
    { label: 'Upcoming Bookings', path: '/dashboard/customer/upcoming', icon: 'Ticket' },
    { label: 'Dining History', path: '/dashboard/customer/history', icon: 'History' },
  ],
};
