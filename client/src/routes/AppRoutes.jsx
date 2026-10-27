import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CounterLayout from '../layouts/CounterLayout'; import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../pages/LoginPage'; import CounterPage from '../pages/CounterPage'; import AdminDashboard from '../pages/AdminDashboard'; import ShiftSettings from '../pages/ShiftSettings'; import HistoryPage from '../pages/HistoryPage'; import SalesReportPage from '../pages/SalesReportPage'; import ErrorTicketsPage from '../pages/ErrorTicketsPage';
import HrEmployeesPage from '../pages/HrEmployeesPage';
export default function AppRoutes() {
  const { session, logout } = useAuth();
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  useEffect(() => {
    if (session?.user?.role === 'superAdmin' && path !== '/admin/sales-reports') {
      window.history.replaceState(null, '', '/admin/sales-reports');
      setPath('/admin/sales-reports');
    }
  }, [session, path]);

  if (!session) return <LoginPage />;

  if (session.user.role === 'superAdmin') {
    return <AdminLayout user={session.user} onLogout={logout}><SalesReportPage /></AdminLayout>;
  }

  if (path.startsWith('/admin')) {
    const page = path === '/admin/shifts' ? <ShiftSettings /> : path === '/admin/sales-reports' ? <SalesReportPage /> : path === '/admin/garlanding-history' ? <HistoryPage ticketType="GARLANDING" /> : path === '/admin/paging-board-history' ? <HistoryPage ticketType="PAGING BOARD" /> : path === '/admin/garlanding-error-tickets' ? <ErrorTicketsPage ticketType="GARLANDING" /> : path === '/admin/paging-board-error-tickets' ? <ErrorTicketsPage ticketType="PAGING BOARD" /> : path === '/admin/employees' ? <HrEmployeesPage /> : <AdminDashboard />;
    return session.user.role === 'admin'
      ? <AdminLayout user={session.user} onLogout={logout}>{page}</AdminLayout>
      : <CounterLayout user={session.user} onLogout={logout}><CounterPage /></CounterLayout>;
  }

  return <CounterLayout user={session.user} onLogout={logout}><CounterPage readOnly={session.user.role === 'admin'} /></CounterLayout>;
}
