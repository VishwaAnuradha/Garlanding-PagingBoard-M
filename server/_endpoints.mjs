const base = 'http://localhost:5000';

async function api(path, options = {}) {
  const res = await fetch(base + path, options);
  let body = null;
  const text = await res.text();
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const login = await api('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ epfNumber: 'ADMIN01', password: 'abcde', shift: 'Administrator' }),
});
console.log('login           =>', login.status);
if (login.status !== 200) { console.log(JSON.stringify(login.body)); process.exit(1); }
const token = login.body.token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

for (const path of ['/api/sales/today', '/api/sales/history', '/api/sales/report?date=2026-09-02', '/api/sales/dashboard', '/api/sales/settings', '/api/sales/shifts']) {
  const r = await api(path, { headers });
  console.log(`${path.padEnd(34)} => ${r.status}${r.status === 200 ? '' : ' ' + JSON.stringify(r.body)}`);
}

// Round-trip PUT: write the defaults, confirm it persists, then confirm it did not error.
const put = await api('/api/sales/settings', {
  method: 'PUT',
  headers,
  body: JSON.stringify({ systemName: 'Garlanding Ticket Counter', counterName: 'Arrival Counter', printerName: 'X', ticketPrices: { GARLANDING: 500, 'PAGING BOARD': 300 } }),
});
console.log('settings PUT    =>', put.status, JSON.stringify(put.body));
const after = await api('/api/sales/settings', { headers });
console.log('settings reGET  =>', after.status, JSON.stringify(after.body));
process.exit(0);
