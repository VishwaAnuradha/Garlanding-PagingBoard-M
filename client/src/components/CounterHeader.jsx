import { Plane, Power } from 'lucide-react';

function ConnectionBadge({ label, connected, connectedText, disconnectedText }) {
  const colors = connected
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-red-200 bg-red-50 text-red-700';
  const dotColor = connected ? 'bg-emerald-500' : 'bg-red-500';

  return <div className={`min-w-[155px] rounded border px-2 py-0.5 ${colors}`} role="status" aria-live="polite">
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
      <div className="leading-tight">
        <p className="text-[8px] font-medium uppercase tracking-[0.1em] text-zinc-600">{label}</p>
        <p className="text-[10px] font-bold">{connected ? connectedText : disconnectedText}</p>
      </div>
    </div>
  </div>;
}

export default function CounterHeader({ user, onLogout, ticketType, connectionStatus }) {
  const airport = user?.airport || 'BIA';
  const title = ticketType === 'PAGING BOARD' ? `PAGING BOARD COUNTER - ${airport}` : `GARLANDING TICKET COUNTER - ${airport}`;
  const { serverConnected = false, databaseConnected = false } = connectionStatus || {};

  return <header className="flex h-[70px] border-b border-zinc-200 bg-white">
    <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-6 sm:px-8">
      <h1 className="truncate text-lg font-bold text-[#3a7fb8] sm:text-xl">{title}</h1>
      <div className="flex shrink-0 flex-col gap-1">
        <ConnectionBadge label="Database" connected={databaseConnected} connectedText="Database connected" disconnectedText="Database not connected" />
        <ConnectionBadge label="Network / Server" connected={serverConnected} connectedText="Server connected" disconnectedText="Server not connected" />
      </div>
    </div>
      <div className="flex h-[70px] min-w-40 items-center justify-between gap-3 px-4 text-white sm:min-w-60" style={{ background: 'linear-gradient(110deg, #0369a1, #0f766e)' }}>
        <div className="flex items-center gap-2">
          <Plane className="text-sky-300" size={32} strokeWidth={2.25} aria-hidden="true" />
          <span className="text-xs">
            Airport: <b className="text-yellow-300">{airport}</b> / SSN: {user.ssn || user.epfNumber}<br />
            {user.sessionId ? `Session ID: ${user.sessionId}` : user.shift}
          </span>
        </div>
        {user.role === 'admin' && <a href="/admin" className="rounded px-2 py-1 text-xs font-bold text-emerald-300 hover:bg-zinc-800 hover:text-white">ADMIN</a>}
        <button onClick={onLogout} className="p-1.5 text-red-500 transition-all hover:scale-105 hover:text-red-400" title="Log out" aria-label="Log out">
          <Power size={24} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
  </header>;
}
