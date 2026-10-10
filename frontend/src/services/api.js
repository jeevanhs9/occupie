const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');
// Auth and operations are served by the same Flask origin. Derive both paths
// from VITE_API_BASE_URL so a custom backend host cannot split login from data.
const AUTH_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '/api/auth');
const API_PROXY_TARGET = import.meta.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000';

// API-backed accounts are the default. Demo fixtures are an explicit preview choice only.
// Preview role switching and fixtures must never ship in a production bundle.
export const DATA_MODE = import.meta.env.DEV && import.meta.env.VITE_DATA_MODE === 'demo' ? 'demo' : 'api';

function csrfToken(cookieName) {
  if (typeof document === 'undefined') return '';
  const prefix = `${cookieName}=`;
  const pair = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));
  if (!pair) return '';
  try {
    return decodeURIComponent(pair.slice(prefix.length));
  } catch {
    return '';
  }
}

async function send(url, options = {}, csrfCookie = 'occupie_csrf_access') {
  const method = (options.method || 'GET').toUpperCase();
  const csrf = ['GET', 'HEAD', 'OPTIONS'].includes(method) ? '' : csrfToken(csrfCookie);
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
    ...(options.headers || {}),
  };
  try {
    const response = await fetch(url, { ...options, method, headers, credentials: 'include' });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    return response.ok
      ? { success: true, data, status: response.status }
      : { success: false, error: data?.message || data?.error || `Request failed with status ${response.status}.`, status: response.status, data };
  } catch (error) {
    const isRelativeUrl = !/^https?:\/\//i.test(url);
    const target = isRelativeUrl ? API_PROXY_TARGET : new URL(url).origin;
    const connectionHint = isRelativeUrl
      ? `Start Flask from the backend directory with "python run.py" and confirm the Vite proxy target (${target}).`
      : `Check that the configured Flask API at ${target} is running and allows this frontend origin.`;
    return {
      success: false,
      error: `Could not connect to the Occupie API. ${connectionHint}`,
      isNetworkError: true,
      cause: error?.message || 'Network request failed.',
    };
  }
}

async function authRequest(endpoint, options = {}, csrfCookie) {
  return send(`${AUTH_BASE_URL}${endpoint}`, options, csrfCookie);
}

async function request(endpoint, options = {}) {
  return send(`${API_BASE_URL}${endpoint}`, options);
}

async function download(endpoint, fileName) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { credentials: 'include' });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return { success: false, status: response.status, error: body?.message || `Request failed with status ${response.status}.` };
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return { success: true, status: response.status };
  } catch {
    return { success: false, isNetworkError: true, error: 'Could not connect to the Occupie API. Confirm the Flask service is running and try again.' };
  }
}

const jsonRequest = (method, body) => ({ method, body: JSON.stringify(body) });

export const fetchHealth = () => request('/health');

export const authService = {
  me: () => authRequest('/me'),
  restore: () => authRequest('/me'),
  login: ({ email, password }) => authRequest('/login', jsonRequest('POST', { email, password })),
  register: ({ name, email, password }) => authRequest('/register', jsonRequest('POST', { name, email, password })),
  logout: () => authRequest('/logout', jsonRequest('POST')),
};

export const apiService = {
  auth: authService,
  health: fetchHealth,
  restaurants: () => authRequest('/restaurants'),
  tables: {
    list: () => request('/tables'),
    create: (table) => request('/tables', jsonRequest('POST', table)),
    updateStatus: (tableId, status, partySize) => request(
      `/tables/${encodeURIComponent(tableId)}/status`,
      jsonRequest('PATCH', { status, ...(partySize ? { partySize } : {}) }),
    ),
    importCSV: (csv) => request('/tables/import', jsonRequest('POST', { csv })),
  },
  reservations: {
    list: () => request('/reservations'),
    create: (reservation) => request('/reservations', jsonRequest('POST', reservation)),
    requestReassignment: (reservationId, tableId, reason = '') => request(
      `/reservations/${encodeURIComponent(reservationId)}/reassignment`,
      jsonRequest('POST', { tableId, reason }),
    ),
    updateStatus: (reservationId, status) => request(
      `/reservations/${encodeURIComponent(reservationId)}/status`,
      jsonRequest('PATCH', { status }),
    ),
  },
  allocations: {
    getRecommendations: ({ partySize, at, preferredSection, returnAlternatives = false }) => {
      const params = new URLSearchParams({ party_size: String(partySize) });
      if (at) params.set('at', at);
      if (preferredSection) params.set('preferred_section', preferredSection);
      if (returnAlternatives) params.set('return_alternatives', 'true');
      return request(`/allocations/recommend?${params.toString()}`);
    },
    simulate: (parties) => request('/allocations/simulate', jsonRequest('POST', { parties })),
  },
  settings: {
    get: () => request('/settings/allocation'),
    update: (settings) => request('/settings/allocation', jsonRequest('PATCH', settings)),
  },
  reports: {
    shift: () => request('/reports/shift'),
    exportCSV: () => download('/reports/export.csv', 'occupie-operational-report.csv'),
  },
  reassignments: {
    list: () => request('/reassignments'),
    review: (requestId, status) => request(
      `/reassignments/${encodeURIComponent(requestId)}/status`,
      jsonRequest('PATCH', { status }),
    ),
  },
  waitlist: {
    list: () => request('/waitlist'),
    create: (entry) => request('/waitlist', jsonRequest('POST', entry)),
    updateStatus: (entryId, status) => request(
      `/waitlist/${encodeURIComponent(entryId)}`,
      jsonRequest('PATCH', { status }),
    ),
    seat: (entryId, tableId) => request(
      `/waitlist/${encodeURIComponent(entryId)}/seat`,
      jsonRequest('POST', tableId ? { tableId } : {}),
    ),
  },
};

export default apiService;
