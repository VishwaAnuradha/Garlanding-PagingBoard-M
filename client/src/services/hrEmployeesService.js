const authHeaders = () => {
  const session = JSON.parse(sessionStorage.getItem('arrival-taxi-session') || 'null');
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
};

export async function getHrEmployees() {
  const response = await fetch('/api/hr/employees', { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load employees.');
  return data;
}
