import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { getHrEmployees } from '../services/hrEmployeesService';

const fields = [
  ['service_no', 'Service no.'], ['NIC', 'NIC'], ['name', 'Name'], ['DOB', 'Date of birth'],
  ['sex', 'Sex'], ['address', 'Address'], ['appointment_date', 'Appointment date'],
  ['civil_state', 'Civil state'], ['designation_id', 'Designation ID'],
  ['salary_scale_id', 'Salary scale ID'], ['location_id', 'Location ID'],
  ['division_id', 'Division ID'], ['title_id', 'Title ID'], ['has_image', 'Image'],
  ['confirm_date', 'Confirmation date'], ['employee_type_id', 'Employee type ID'],
  ['status_id', 'Status ID'], ['office_phone', 'Office phone'], ['pass_no', 'Pass no.'],
  ['section_id', 'Section ID'], ['DOMarriage', 'Marriage date'], ['Nationality', 'Nationality'],
  ['race', 'Race'], ['NamewithIni', 'Name with initials'], ['lastName', 'Last name'],
  ['NameAsNIC', 'Name as NIC'], ['religionId', 'Religion ID'], ['AlloDivision', 'Allocated division'],
  ['empCeasedType', 'Employment ceased type'], ['empCeasedDate', 'Employment ceased date'],
  ['RetirementDate', 'Retirement date'], ['NameAsBC', 'Name as birth certificate'],
  ['dutyPatternId', 'Duty pattern ID'], ['WorkStationId', 'Work station ID']
];

const displayValue = (value, field) => {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'has_image') return value ? 'Available' : 'Not available';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
};

export default function HrEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedServiceNo, setExpandedServiceNo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      setEmployees(await getHrEmployees());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(employee =>
      ['service_no', 'NIC', 'name', 'NamewithIni', 'lastName', 'division_id', 'section_id']
        .some(field => String(employee[field] ?? '').toLowerCase().includes(query))
    );
  }, [employees, search]);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Administration</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">HR employees</h1>
        <p className="mt-2 text-slate-500">Read-only employee records from the HR_EMPLOYEE database (up to 1,000 records).</p>
      </div>
      <button onClick={loadEmployees} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        <RefreshCw size={16} /> Refresh
      </button>
    </div>

    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search service no., NIC, name, division…" className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <p className="text-sm text-slate-500">{filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {['Service no.', 'NIC', 'Name', 'Division', 'Section', 'Status', ''].map(heading =>
                <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">Loading HR employee records…</td></tr>
              : filteredEmployees.length === 0 ? <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">{employees.length ? 'No employees match your search.' : 'No employee records found.'}</td></tr>
                : filteredEmployees.map((employee, index) => {
                  const serviceNo = employee.service_no ?? index;
                  const expanded = expandedServiceNo === serviceNo;
                  return <FragmentRow key={`${serviceNo}-${index}`} employee={employee} expanded={expanded} onToggle={() => setExpandedServiceNo(expanded ? null : serviceNo)} />;
                })}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

function FragmentRow({ employee, expanded, onToggle }) {
  return <>
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 font-medium text-slate-900">{displayValue(employee.service_no)}</td>
      <td className="px-4 py-3 text-slate-600">{displayValue(employee.NIC)}</td>
      <td className="px-4 py-3 text-slate-900">{displayValue(employee.name || employee.NamewithIni)}</td>
      <td className="px-4 py-3 text-slate-600">{displayValue(employee.division_id)}</td>
      <td className="px-4 py-3 text-slate-600">{displayValue(employee.section_id)}</td>
      <td className="px-4 py-3 text-slate-600">{displayValue(employee.status_id)}</td>
      <td className="px-4 py-3 text-right"><button onClick={onToggle} className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">{expanded ? 'Hide details' : 'Details'}</button></td>
    </tr>
    {expanded && <tr className="bg-slate-50"><td colSpan="7" className="px-4 py-4">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([field, label]) => <div key={field} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 break-words text-sm text-slate-900">{displayValue(employee[field], field)}</dd>
        </div>)}
      </dl>
    </td></tr>}
  </>;
}
