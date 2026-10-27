import { useEffect, useState } from 'react';
import { Activity, Banknote, Calendar, CalendarDays, CreditCard, RefreshCw, Users } from 'lucide-react';
import { getDashboard } from '../services/salesService';

const money = value => `Rs. ${Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setError('');
      setData(await getDashboard());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today = data?.today || {};
  const sessionCashPayments = Number(data?.sessionCashPayments ?? today.cashPayments ?? 0);
  const sessionCreditPayments = Number(data?.sessionCreditPayments ?? today.creditPayments ?? 0);

  const formatHeaderDate = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase();
    } catch {
      return String(dateVal).toUpperCase();
    }
  };

  const cards = [
    {
      title: "TODAY'S TICKETS",
      value: String(today.items || today.transactions || 0),
      note: `${today.items || 0} ticket items sold`,
      Icon: Users,
      bgColor: 'bg-blue-100/90 text-blue-600'
    },
    {
      title: 'TOTAL REVENUE',
      value: money(today.revenue),
      note: 'All sales combined today',
      Icon: Activity,
      bgColor: 'bg-emerald-100/90 text-emerald-600'
    },
    {
      title: 'CASH PAYMENTS',
      value: money(sessionCashPayments),
      note: 'Cash collected in this session',
      Icon: Banknote,
      bgColor: 'bg-amber-100/90 text-amber-600'
    },
    {
      title: 'CARD PAYMENTS',
      value: money(sessionCreditPayments),
      note: 'Card payments in this session',
      Icon: CreditCard,
      bgColor: 'bg-purple-100/90 text-purple-600'
    },
    {
      title: "THIS WEEK'S REVENUE",
      value: money(data?.weekRevenue),
      note: 'Rolling weekly revenue',
      Icon: Calendar,
      bgColor: 'bg-teal-100/90 text-teal-600'
    },
    {
      title: "THIS MONTH'S REVENUE",
      value: money(data?.monthRevenue),
      note: 'Current month revenue',
      Icon: CalendarDays,
      bgColor: 'bg-rose-100/90 text-rose-600'
    }
  ];

  return <div className="space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Operations Overview</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          {data?.businessDate ? formatHeaderDate(data.businessDate) : 'LOADING TODAY’S SALES...'}
        </p>
      </div>
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
      >
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        <span>Refresh</span>
      </button>
    </div>

    {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</p>}

    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ title, value, note, Icon, bgColor }) => (
        <article
          key={title}
          className="group flex items-center gap-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
        >
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${bgColor} transition-transform group-hover:scale-105`}>
            <Icon size={26} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {title}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 truncate">
              {value}
            </p>
            {note && (
              <p className="mt-0.5 text-xs text-slate-400 truncate">
                {note}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  </div>;
}
