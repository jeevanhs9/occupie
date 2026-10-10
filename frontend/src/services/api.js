const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');

// Demo mode is explicit and the default for this hackathon preview. Set
// VITE_DATA_MODE=api to use persisted Flask API data.
export const DATA_MODE = import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'demo';

async function request(endpoint, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Request failed with status ${response.status}.`,
        status: response.status,
        data,
      };
    }
    return { success: true, data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to connect to the Occupie API.',
      isNetworkError: true,
    };
  }
}

const jsonRequest = (method, body) => ({ method, body: JSON.stringify(body) });

export const fetchHealth = () => request('/health');

export const apiService = {
  health: fetchHealth,
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
