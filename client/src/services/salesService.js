const authHeaders = () => { const session = JSON.parse(sessionStorage.getItem('arrival-taxi-session') || 'null'); return session?.token ? { Authorization: `Bearer ${session.token}` } : {}; };
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...authHeaders(), ...options.headers } });
  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = null;
  }
  if (!data || typeof data !== 'object') {
    throw new Error(`The API returned an empty or invalid response (HTTP ${response.status}). Check that the server is running and connected to SQL Server.`);
  }
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}
export const getTodaySales = () => request('/api/sales/today');
export const createSale = (sale) => request('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sale) });
export const closeTodaySales = (details) => request('/api/sales/close', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details) });
export const reopenTodaySales = () => request('/api/sales/reopen', { method: 'POST' });
export const getSystemSettings = () => request('/api/sales/settings');
export const saveSystemSettings = (settings) => request('/api/sales/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
export const getDashboard = () => request('/api/sales/dashboard');
export const getShiftSessions = () => request('/api/sales/shifts');
export const createShiftSession = (shift) => request('/api/sales/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shift) });
export const activateShiftSession = (id) => request(`/api/sales/shifts/${id}/activate`, { method: 'POST' });
export const updateShiftSessionStatus = (id, status) => request(`/api/sales/shifts/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
export const getHistory = (ticketType, page, limit, date) => {
  const params = new URLSearchParams({ ticketType, page, limit });
  if (date) params.set('date', date);
  return request(`/api/sales/history?${params}`);
};
export const getSalesReport = ({ shiftId, date, ticketTypes }) => {
  const params = new URLSearchParams();
  if (shiftId) params.set('shiftId', shiftId);
  if (date) params.set('date', date);
  if (ticketTypes !== undefined) params.set('ticketTypes', ticketTypes.join(','));
  return request(`/api/sales/report?${params}`);
};
export const voidTicket = (ticketId, printFailure = false) => request('/api/sales/void', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId, printFailure }) });
export const getErrorTickets = (ticketType, page = 1, limit = 50, date) => {
  const params = new URLSearchParams({ ticketType, page, limit });
  if (date) params.set('date', date);
  return request(`/api/sales/error-tickets?${params}`);
};
export const getSessionIncome = () => request('/api/sales/session-income');
