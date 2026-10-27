import { useState } from 'react';
import { Eye, EyeOff, Plane } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import aaslLogo from '../assets/aasl-logo.svg';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ airport: 'BIA', ssn: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await login(form);
      if (['admin', 'superAdmin'].includes(session.user.role)) window.location.assign('/admin');
    } catch (err) {
      setError(err.status === 503
        ? `Cannot sign in to ${form.airport}: its database is unavailable or access was denied. Contact IT to verify the airport database connection and SQL login permissions.`
        : err.message || 'Invalid airport, SSN, or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <main className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 font-sans">
    <header className="border-b border-slate-200 bg-white shadow-md">
      <div className="mx-auto flex min-h-28 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" className="flex min-w-0 items-center gap-4" aria-label="Airport and Aviation Services home">
          <img
            src={aaslLogo}
            alt="Airport and Aviation Services Sri Lanka"
            className="h-11 sm:h-12 w-auto object-contain shrink-0"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2.5 text-sm font-bold text-slate-900 sm:text-xl lg:text-2xl">
              <Plane size={26} className="text-[#26347d] shrink-0" />
              <span className="truncate">Garlanding &amp; PagingBoard Ticket Counter</span>
              <Plane size={26} className="text-[#26347d] shrink-0" />
            </span>
            <span className="hidden text-xs text-slate-500 sm:block mt-0.5">
              Airport and Aviation Services (Sri Lanka) (Private) Limited
            </span>
          </span>
        </a>
      </div>
    </header>

    <div className="flex flex-1 items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700/60 bg-white shadow-2xl shadow-blue-950/50"
      >
        {/* Login header */}
        <div className="border-b border-slate-200 bg-white px-7 py-4 text-slate-900">
          <h1 className="text-xl font-bold tracking-wide text-slate-900">
            Garlanding & PagingBoard Ticket Counter
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Airport and Aviation Services (Sri Lanka) (Private) Limited
          </p>
        </div>

        {/* Login fields */}
        <div className="space-y-4 bg-slate-50/80 p-5">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Airport</label>
          <select
            name="airport"
            value={form.airport}
            onChange={change}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-[#2d7ab5] focus:ring-2 focus:ring-sky-100"
            required
          >
            <option value="BIA">BIA - Bandaranaike International Airport</option>
            <option value="CIAR">CIAR - Colombo International Airport Ratmalana</option>
            <option value="JIA">JIA - Jaffna International Airport</option>
            <option value="MRIA">MRIA - Mattala Rajapaksa International Airport</option>
            <option value="BTIA">BTIA - Batticaloa International Airport</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">SSN / Service Number</label>
          <input
            name="ssn"
            value={form.ssn}
            onChange={change}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-[#2d7ab5] focus:ring-2 focus:ring-sky-100"
            autoComplete="username"
            inputMode="numeric"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={change}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-11 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-[#2d7ab5] focus:ring-2 focus:ring-sky-100"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(visible => !visible)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-[#2d7ab5] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={19} strokeWidth={2} /> : <Eye size={19} strokeWidth={2} />}
            </button>
          </div>
        </div>

        {/* Login error message */}
        {error && (
          <p className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs font-medium text-red-700" role="alert" aria-live="assertive">
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          disabled={loading}
          className="h-10 w-full rounded-lg border border-[#1d5f93] bg-gradient-to-r from-[#2d7ab5] to-[#1d5f93] text-sm font-semibold text-white shadow-md transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
        </div>

        {/* Footer */}
        <footer className="flex h-9 items-center justify-between border-t border-slate-700/40 bg-[#0f3b60] px-5 text-[10px] font-medium text-slate-200">
          <span>Airport and Aviation Services (Sri Lanka) (Private) Limited</span>
          <span>IT Division</span>
        </footer>
      </form>
    </div>
  </main>
);
}
