const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');
const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_API_URL || `${API_BASE_URL.replace(/\/api\/v1$/, '')}/api/auth`).replace(/\/$/, '');

// API-backed accounts are the default. Demo fixtures are an explicit preview choice only.
export const DATA_MODE = import.meta.env.VITE_DATA_MODE === 'demo' ? 'demo' : 'api';

function csrfToken(cookieName) {
  if (typeof document === 'undefined') return '';
  const prefix = `${cookieName}=`;
  const pair = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));
  return pair ? decodeURIComponent(pair.slice(prefix.length)) : '';
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
    return { success: false, error: error instanceof Error ? error.message : 'Unable to connect to the Occupie API.', isNetworkError: true };
  }
}

async function authRequest(endpoint, options = {}, csrfCookie) {
  return send(`${AUTH_BASE_URL}${endpoint}`, options, csrfCookie);
}

async function request(endpoint, options = {}, retried = false) {
  const result = await send(`${API_BASE_URL}${endpoint}`, options);
  if (result.status === 401 && !retried) {
    const renewed = await authRequest('/refresh', { method: 'POST', body: '{}' }, 'occupie_csrf_refresh');
    if (renewed.success) return request(endpoint, options, true);
  }
  return result;
}

const jsonRequest = (method, body) => ({ method, body: JSON.stringify(body) });

export const fetchHealth = () => request('/health');

export const authService = {
  me: () => authRequest('/me'),
  restore: async () => {
    const current = await authRequest('/me');
    if (current.success || current.status !== 401) return current;
    const refreshed = await authRequest('/refresh', { method: 'POST', body: '{}' }, 'occupie_csrf_refresh');
    return refreshed.success ? authRequest('/me') : current;
  },
  login: ({ email, password }) => authRequest('/login', jsonRequest('POST', { email, password })),
  register: ({ name, email, password }) => authRequest('/register', jsonRequest('POST', { name, email, password })),
  verify: (token) => authRequest('/verify', jsonRequest('POST', { token })),
  resendVerification: (email) => authRequest('/resend-verification', jsonRequest('POST', { email })),
  forgotPassword: (email) => authRequest('/forgot-password', jsonRequest('POST', { email })),
  resetPassword: (token, password) => authRequest('/reset-password', jsonRequest('POST', { token, password })),
  logout: () => authRequest('/logout', jsonRequest('POST'), 'occupie_csrf_refresh'),
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
  },
  reservations: {
    list: () => request('/reservations'),
    create: (reservation) => request('/reservations', jsonRequest('POST', reservation)),
    updateStatus: (reservationId, status) => request(
      `/reservations/${encodeURIComponent(reservationId)}/status`,
      jsonRequest('PATCH', { status }),
    ),
  },
  allocations: {
    getRecommendations: ({ partySize, at, preferredSection }) => {
      const params = new URLSearchParams({ party_size: String(partySize) });
      if (at) params.set('at', at);
      if (preferredSection) params.set('preferred_section', preferredSection);
      return request(`/allocations/recommend?${params.toString()}`);
    },
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
