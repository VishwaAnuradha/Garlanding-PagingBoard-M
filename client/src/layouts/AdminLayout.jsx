import { useState } from 'react';
import { AlertOctagon, BarChart3, ChevronDown, Clock3, FileBarChart, History, LogOut, Plane, Ticket } from 'lucide-react';
import aaslLogo from '../assets/aasl-logo.svg';

export default function AdminLayout({ children, user, onLogout }) {
  const path = window.location.pathname;
  const links = [
    ['/admin', 'Dashboard', BarChart3],
    ['/admin/sales-reports', 'Sales reports', FileBarChart],
    ['/admin/shifts', 'Shift settings', Clock3],
    ['/admin/garlanding-history', 'Garlanding history', History],
    ['/admin/paging-board-history', 'Paging Board history', History],
    ['/admin/garlanding-error-tickets', 'Garlanding Error tickets', AlertOctagon],
    ['/admin/paging-board-error-tickets', 'Paging Board Error tickets', AlertOctagon],
    ['/', 'Counter', Ticket]
  ];
  const visibleLinks = user.role === 'superAdmin'
    ? links.filter(([href]) => href === '/admin/sales-reports')
    : links;
  const homeHref = user.role === 'superAdmin' ? '/admin/sales-reports' : '/admin';

  const [loggedTime] = useState(() => {
    const stored = sessionStorage.getItem('login-time');
    if (stored) return stored;
    const time = new Date().toTimeString().slice(0, 8);
    sessionStorage.setItem('login-time', time);
    return time;
  });

  const airportName = user?.airport ? `${user.airport} - Katunayake` : 'BIA - Katunayake';
  const adminId = user?.epfNumber || user?.username || '1001';

  return <div className="min-h-screen bg-slate-100 text-slate-900">

    <header className="border-b border-slate-200/90 bg-white text-slate-900 shadow-xs">
      <div className="mx-auto flex min-h-[90px] max-w-8xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a href={homeHref} className="flex items-center gap-4 group" aria-label="Garlanding Admin home">
          <img
            src={aaslLogo}
            alt="Airport and Aviation Services Sri Lanka"
            className="h-11 w-auto object-contain transition-transform group-hover:scale-102"
          />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-tight">
              <Plane size={24} className="text-[#26347d] shrink-0" />
              <span className="truncate">Garlanding &amp; PagingBoard Admin Dashboard</span>
              <Plane size={24} className="text-[#26347d] shrink-0" />
            </h1>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 leading-tight mt-1">
              Airport &amp; Aviation Services (Sri Lanka) (Private) Limited
            </p>
          </div>
        </a>

        {/* Updated Status Pills & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
          {/* ● AIRPORT: BIA - Katunayake ▾ */}
          <div className="flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-600/70 px-4 py-1.5 font-semibold text-blue-900 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-pink-900" />
            <span className="tracking-wide">AIRPORT: {airportName}</span>
            
          </div>

          {/* ADMIN: 1001 */}
          <div className="rounded-full border border-slate-200 bg-white px-4 py-1.5 font-semibold text-slate-700 shadow-2xs">
            ADMIN: <span className="font-bold text-slate-900">{adminId}</span>
          </div>

          {/* LOGGED: HH:MM:SS */}
          <div className="font-semibold text-slate-500 tracking-wide px-1">
            LOGGED: <span className="text-slate-700">{loggedTime}</span>
          </div>

          {/* LOGOUT */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 font-bold text-red-500 hover:text-red-700 transition-colors uppercase cursor-pointer tracking-wider px-2 py-1"
            title="Log out"
          >
            <span>LOGOUT</span>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>

    <div className="grid w-full md:grid-cols-[255px_1fr]">
      <aside className="bg-white p-4 sm:p-5 border-r border-slate-200/80 md:min-h-[calc(100vh-78px)]">
        <p className="px-3 mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>
        <nav className="flex gap-2.5 md:flex-col">
          {visibleLinks.map(([href, label, Icon], index) => {
            const isActive = path === href;
            const isAfterShifts = href === '/admin/garlanding-history';
            const isCounter = href === '/';
            return (
              <div key={href} className="flex flex-col">
                {(isAfterShifts || isCounter) && (
                  <div className="my-2 border-t border-slate-100" />
                )}
                <a
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                    }`}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </a>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="p-6 md:p-10">
        {children}
      </main>
    </div>

  </div>;
}
