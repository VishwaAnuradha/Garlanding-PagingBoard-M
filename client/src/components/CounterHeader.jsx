import { Plane } from 'lucide-react';

export default function CounterHeader({ user, onLogout, ticketType }) {
  const airport = user?.airport || 'BIA';
  const title = ticketType === 'PAGING BOARD' ? `PAGING BOARD COUNTER - ${airport}` : `GARLANDING TICKET COUNTER - ${airport}`;

  return <header className="flex h-[70px] items-center justify-between border-b border-zinc-200">
    <h1 className="ml-5 text-xl font-bold text-[#3a7fb8] sm:ml-8">{title}</h1>
    <div className="flex h-full min-w-40 items-center justify-between gap-3 px-4 text-white sm:min-w-60" style={{ background: 'linear-gradient(110deg, #0369a1, #0f766e)' }}>
      <div className="flex items-center gap-2">
        <Plane className="text-sky-300" size={32} strokeWidth={2.25} aria-hidden="true" />
        <span className="text-xs">
          Airport: <b className="text-yellow-300">{airport}</b> · SSN: {user.ssn || user.epfNumber}<br />
          {user.sessionId ? `Session ID: ${user.sessionId}` : user.shift}
        </span>
      </div>
      {user.role === 'admin' && <a href="/admin" className="rounded px-2 py-1 text-xs font-bold text-emerald-300 hover:bg-zinc-800 hover:text-white">ADMIN</a>}
      <button onClick={onLogout} className="text-3xl text-red-500 hover:opacity-80 transition-opacity" title="Log out" aria-label="Log out">⏻</button>
    </div>
  </header>;
}
