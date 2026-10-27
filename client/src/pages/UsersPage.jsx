import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, X, Save, Eye, EyeOff } from 'lucide-react';

const API = '/api/users';
const authHeaders = () => {
  const session = JSON.parse(sessionStorage.getItem('arrival-taxi-session') || 'null');
  return session?.token ? { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const empty = { userId: '', password: '', employeeNo: '', name: '', division: '', section: '', category: 'User', contacts: '', address: '', shift: '' };

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

export default function UsersPage() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);   // null = create, string userId = edit
  const [form, setForm]             = useState(empty);
  const [showPw, setShowPw]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      setError('');
      setUsers(await apiFetch(API));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setFormError(''); setShowPw(false); setShowModal(true); };
  const openEdit   = (u) => {
    setEditing(u.UserID);
    setForm({ userId: u.UserID, password: '', employeeNo: u.EmployeeNo || '', name: u.Name || '', division: u.Division || '', section: u.Section || '', category: u.Category || '', contacts: u.Contacts || '', address: u.Address || '', shift: u.Shift || '' });
    setFormError(''); setShowPw(false); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setFormError(''); };

  const save = async () => {
    setSaving(true); setFormError('');
    try {
      if (editing) {
        await apiFetch(`${API}/${encodeURIComponent(editing)}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch(API, { method: 'POST', body: JSON.stringify(form) });
      }
      closeModal();
      await load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`${API}/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e.message);
      setDeleteTarget(null);
    }
  };

  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Administration</p>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Users size={28} />Users</h1>
          <p className="mt-1 text-slate-500">Manage system users from the USERS table</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 active:scale-95 transition-all">
          <Plus size={16} /> Add User
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {['UserID', 'Password', 'SSN / Service No', 'Name', 'Division', 'Section', 'Category', 'Contacts', 'Shift', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="py-10 text-center text-slate-400">Loading users…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={10} className="py-10 text-center text-slate-400">No users found in dbo.USERS</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.UserID} className={`border-t border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'} hover:bg-emerald-50/40 transition-colors`}>
                <td className="px-4 py-3 font-mono font-semibold text-emerald-700">{u.UserID}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-mono text-slate-600">{visiblePasswords[u.UserID] ? (u.Password || '—') : (u.Password ? '••••••••' : '—')}</span>
                    {u.Password && <button type="button" onClick={() => setVisiblePasswords(current => ({ ...current, [u.UserID]: !current[u.UserID] }))} title={visiblePasswords[u.UserID] ? 'Hide password' : 'Show password'} className="text-slate-400 hover:text-slate-600">
                      {visiblePasswords[u.UserID] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>}
                  </div>
                </td>
                <td className="px-4 py-3">{u.EmployeeNo}</td>
                <td className="px-4 py-3 font-medium">{u.Name}</td>
                <td className="px-4 py-3 text-slate-600">{u.Division || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{u.Section || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{u.Category || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{u.Contacts || '—'}</td>
                <td className="px-4 py-3">
                  {u.Shift ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{u.Shift}</span> : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} title="Edit" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(u.UserID)} title="Delete" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{editing ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{formError}</p>}

              <div className="grid grid-cols-2 gap-4">
                <FormField label="User ID *" disabled={!!editing}>
                  <input value={form.userId} onChange={e => field('userId', e.target.value)} disabled={!!editing} className="form-inp" placeholder="e.g. SSN / service number" />
                </FormField>
                <FormField label="SSN / Service Number *">
                  <input value={form.employeeNo} onChange={e => field('employeeNo', e.target.value)} className="form-inp" placeholder="Employee No" />
                </FormField>
              </div>

              <FormField label={editing ? 'Password (leave blank to keep)' : 'Password *'}>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => field('password', e.target.value)} className="form-inp pr-9" placeholder={editing ? 'Leave blank to keep current' : 'Enter password'} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormField>

              <FormField label="Name *">
                <input value={form.name} onChange={e => field('name', e.target.value)} className="form-inp" placeholder="Full name" />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Division">
                  <input value={form.division} onChange={e => field('division', e.target.value)} className="form-inp" />
                </FormField>
                <FormField label="Section">
                  <input value={form.section} onChange={e => field('section', e.target.value)} className="form-inp" />
                </FormField>
                <FormField label="Category">
                  <select value={form.category} onChange={e => field('category', e.target.value)} className="form-inp">
                    <option value="SuperAdmin">SuperAdmin</option>
                    <option value="Administrator">Administrator</option>
                    <option value="User">User</option>
                  </select>
                </FormField>
                <FormField label="Shift">
                  <input value={form.shift} onChange={e => field('shift', e.target.value)} className="form-inp" placeholder="e.g. Shift A" />
                </FormField>
              </div>

              <FormField label="Contacts">
                <input value={form.contacts} onChange={e => field('contacts', e.target.value)} className="form-inp" placeholder="Phone / email" />
              </FormField>
              <FormField label="Address">
                <textarea value={form.address} onChange={e => field('address', e.target.value)} rows={2} className="form-inp resize-none" />
              </FormField>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button onClick={closeModal} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60 transition-all">
                <Save size={15} />{saving ? 'Saving…' : (editing ? 'Update User' : 'Create User')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-red-100 p-2 text-red-600"><Trash2 size={20} /></span>
              <h2 className="text-lg font-bold">Delete User</h2>
            </div>
            <p className="text-slate-600">Are you sure you want to delete user <strong>{deleteTarget}</strong>? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 active:scale-95 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, disabled, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
