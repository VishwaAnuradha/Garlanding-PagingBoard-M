import { useEffect, useState } from 'react';
import { RefreshCw, Clock, Ticket } from 'lucide-react';
import { getHistory } from '../services/salesService';
import { useAuth } from '../context/AuthContext';

const money = value => `Rs. ${Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;

export default function HistoryPage({ ticketType }) {
  const { session } = useAuth();
  const [data, setData] = useState({ tickets: [], pagination: { page: 1, totalPages: 1 } });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      setError('');
      setData(await getHistory(ticketType, page, limit, date));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ticketType, page, date]);

  const pageTitle = ticketType === 'PAGING BOARD' ? 'Paging Board Ticket History' : 'Garlanding Ticket History';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Audit &amp; Transactions</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Airport: {session?.user?.airport || 'BIA'} · Paginated audit records of past {ticketType.toLowerCase()} sales.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={event => {
                setDate(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 shadow-2xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          {date && (
            <button
              type="button"
              onClick={() => {
                setDate('');
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
          <button 
            onClick={load} 
            disabled={loading} 
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Serial No</th>
                <th className="px-6 py-3.5">Reference</th>
                <th className="px-6 py-3.5">Company</th>
                <th className="px-6 py-3.5 text-center">Qty</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
                <th className="px-6 py-3.5">Date &amp; Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={22} className="animate-spin text-blue-600" />
                      <span className="text-xs font-semibold">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : data.tickets.length > 0 ? (
                data.tickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center rounded-lg bg-blue-50/80 px-2.5 py-1 text-xs font-mono font-bold text-blue-700 border border-blue-100/70">
                        #{ticket.serialNo}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{ticket.flightNo}</td>
                    <td className="px-6 py-3.5 text-slate-600">{ticket.company || '—'}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {ticket.qty}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-extrabold text-slate-900">{money(ticket.amount)}</td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs">
                      {new Date(ticket.createdAt).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Ticket size={26} className="text-slate-300" />
                      <span className="text-xs font-semibold">No tickets found for {ticketType}.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-6 py-3.5">
          <p className="text-xs font-medium text-slate-500">
            Page <strong className="font-bold text-slate-800">{data.pagination.page}</strong> of <strong className="font-bold text-slate-800">{Math.max(1, data.pagination.totalPages)}</strong>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= data.pagination.totalPages || loading}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
