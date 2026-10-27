import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Plus, RefreshCw } from 'lucide-react';
import { createShiftSession, getShiftSessions, updateShiftSessionStatus } from '../services/salesService';
import { formatBusinessDateTime as displayDate } from '../utils/formatters';

const toInput = date => { 
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); 
  return local.toISOString().slice(0, 10); 
};

const initialForm = () => ({ 
  startAt: toInput(new Date()), 
  endAt: toInput(new Date(Date.now() + 8 * 60 * 60 * 1000)), 
  shiftType: '' 
});

function StatusAction({ session }) {
  if (session.active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
        Active
      </span>
    );
  }
  if (session.status === 'CLOSED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200 shadow-2xs">
        Closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 shadow-2xs">
      Pending
    </span>
  );
}

export default function ShiftSettings() {
  const [form, setForm] = useState(initialForm);
  const [sessions, setSessions] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => { 
    try { 
      const data = await getShiftSessions(); 
      setSessions(data.sessions || []); 
    } catch (error) { 
      setMessage(error.message); 
    } 
  };

  useEffect(() => { load(); }, []);

  const create = async event => { 
    event.preventDefault(); 
    setSaving(true); 
    setMessage(''); 
    try { 
      await createShiftSession(form); 
      setForm(initialForm()); 
      setMessage('Shift session created and activated.'); 
      await load(); 
    } catch (error) { 
      setMessage(error.message); 
    } finally { 
      setSaving(false); 
    } 
  };

  const changeStatus = async (sessionId, nextStatus) => {
    setUpdatingId(sessionId);
    setMessage('');
    try {
      const response = await updateShiftSessionStatus(sessionId, nextStatus);
      setMessage(response.message || `Session updated to ${nextStatus}.`);
      await load();
    } catch (error) {
      setMessage(error.message || 'Unable to update the session status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Administration</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Shift settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create Day/Night or 24 Hours sessions and select the session currently operating at the counter.
        </p>
      </div>

      <form onSubmit={create} className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs border border-blue-100/70">
            <CalendarClock size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Create shift</h2>
            <p className="text-[11px] text-slate-400">Set the planned start and end date for the session.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field 
            label="Session start date" 
            type="date" 
            value={form.startAt} 
            onChange={event => setForm({ ...form, startAt: event.target.value })} 
            required 
          />
          <Field 
            label="Session end date" 
            type="date" 
            value={form.endAt} 
            onChange={event => setForm({ ...form, endAt: event.target.value })} 
            required 
          />
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="mb-1.5 block">Shift type</span>
              <select 
                value={form.shiftType} 
                onChange={event => setForm({ ...form, shiftType: event.target.value })} 
                required 
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select shift type</option>
                <option value="Day/Night">Day/Night</option>
                <option value="24 Hours">24 Hours</option>
              </select>
            </label>
          </div>
        </div>

        <button 
          disabled={saving} 
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-60"
        >
          <Plus size={18} />
          <span>{saving ? 'Creating...' : 'Create shift'}</span>
        </button>
      </form>

      {message && (
        <p className={`rounded-xl p-4 text-xs font-semibold border ${message.includes('created') || message.includes('updated') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Created shift sessions</h2>
          <span className="text-xs font-medium text-slate-400">Total: {sessions.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Session ID</th>
                <th className="px-6 py-3.5">Start date &amp; time</th>
                <th className="px-6 py-3.5">End date &amp; time</th>
                <th className="px-6 py-3.5">Shift type</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length ? (
                sessions.map(session => (
                  <tr key={session.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center rounded-lg bg-blue-50/80 px-2.5 py-1 text-xs font-mono font-bold text-blue-700 border border-blue-100/70">
                        #{session.id}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">{displayDate(session.startAt)}</td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">{displayDate(session.endAt)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${session.shiftType === 'Day/Night' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
                        {session.shiftType}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <StatusAction session={session} />
                        <select 
                          value={session.active ? 'ACTIVE' : session.status === 'CLOSED' ? 'CLOSED' : 'PENDING'} 
                          onChange={event => changeStatus(session.id, event.target.value)} 
                          disabled={updatingId === session.id} 
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="ACTIVE">Active</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-xs font-semibold text-slate-400">
                    No shift sessions have been created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, ...props }) { 
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
      <span className="mb-1.5 block">{label}</span>
      <input 
        {...props} 
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100" 
      />
    </label>
  ); 
}
