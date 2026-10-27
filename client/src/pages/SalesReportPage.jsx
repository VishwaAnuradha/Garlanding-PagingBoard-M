import { useEffect, useMemo, useState } from 'react';
import { FileText, Printer, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSalesReport, getShiftSessions } from '../services/salesService';
import { getLocalPrinters, printReportPdf } from '../services/localPrintService';
import { formatBusinessDateTime as displayDate } from '../utils/formatters';
import { formatReportDate, formatReportMoney as money, formatReportSerial, getSessionReportSummary } from '../utils/sessionReportSummary';
import { createSalesReportPdf } from '../utils/reportDownloader';
import aaslLogo from '../assets/aasl-logo.svg';

export default function SalesReportPage() {
  const { session } = useAuth();
  const canEditBankingInfo = session?.user?.role === 'admin';
  const [shifts, setShifts] = useState([]);
  const [filters, setFilters] = useState({
    date: '',
    shiftId: '',
    depositSlipNo: '',
    bank: '',
    remark: '',
    ticketTypes: ['GARLANDING']
  });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [printerName, setPrinterName] = useState('');
  const [printerNotice, setPrinterNotice] = useState('');
  const [printersLoading, setPrintersLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    getShiftSessions().then(data => setShifts(data.sessions || [])).catch(err => setError(err.message));
  }, []);

  const refreshPrinters = async () => {
    setPrintersLoading(true);
    setPrinterNotice('');
    try {
      const result = await getLocalPrinters();
      const availablePrinters = (result.printers || []).filter(printer => printer.available);
      setPrinters(result.printers || []);
      setPrinterName(current => {
        if (availablePrinters.some(printer => printer.name === current)) return current;
        return availablePrinters.find(printer => printer.name === result.defaultPrinter)?.name
          || availablePrinters[0]?.name
          || '';
      });
      if (!availablePrinters.length) {
        setPrinterNotice('No connected, ready printer was found. Connect a printer and refresh.');
      }
    } catch (err) {
      setPrinters([]);
      setPrinterName('');
      setPrinterNotice(err.message);
    } finally {
      setPrintersLoading(false);
    }
  };

  useEffect(() => { refreshPrinters(); }, []);

  // Only show sessions whose start date matches the selected date
  const sessionsForDate = useMemo(() => {
    if (!filters.date) return [];
    return shifts.filter(shift => {
      if (!shift.startAt) return false;
      const shiftDate = shift.startAt.slice(0, 10);
      return shiftDate === filters.date;
    });
  }, [shifts, filters.date]);

  const setFilter = (name, value) => {
    setFilters(current => {
      const next = { ...current, [name]: value };
      if (name === 'date') { next.shiftId = ''; next.depositSlipNo = ''; next.bank = ''; next.remark = ''; }
      if (name === 'shiftId') { next.depositSlipNo = ''; next.bank = ''; next.remark = ''; }
      return next;
    });
    setReport(null);
  };

  const preview = async event => {
    event.preventDefault();
    if (!filters.date) { setError('Select a date.'); setReport(null); return; }
    setLoading(true); setError('');
    try {
      const result = await getSalesReport({
        date: filters.date,
        shiftId: filters.shiftId || undefined,
        ticketTypes: filters.ticketTypes
      });
      setReport({
        ...result,
        depositSlipNo: filters.depositSlipNo,
        bank: filters.bank,
        remark: filters.remark,
        generatedAt: new Date().toISOString()
      });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const printReport = async () => {
    if (!report || !printerName) {
      setPrinterNotice('Select an available printer before printing.');
      return;
    }
    setPrinting(true);
    setPrinterNotice('');
    try {
      const blob = createSalesReportPdf(report);
      const result = await printReportPdf(blob, printerName);
      setPrinterNotice(result.message);
    } catch (err) {
      setPrinterNotice(err.message);
    } finally {
      setPrinting(false);
    }
  };

  const sessionDisabled = !filters.date;
  const bankingDisabled = !filters.date || !canEditBankingInfo;

  return <div className="sales-report-print-page mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Administration</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Sales reports</h1>
        <p className="mt-1 text-sm text-slate-500">Create a printable summary for a shift session or a single business date.</p>
      </div>
    </div>

    <div className="sales-report-layout grid overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs lg:grid-cols-[380px_1fr]">
      <form onSubmit={preview} className="sales-report-filters border-b border-slate-200/80 p-6 lg:border-b-0 lg:border-r bg-white flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shadow-2xs border border-emerald-100/60">
              <FileText size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Filter Report</h2>
              <p className="text-[11px] text-slate-400">Configure parameters for generation</p>
            </div>
          </div>

          {/* Ticket Type */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Ticket Type</p>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70">
              {[
                { id: 'GARLANDING', label: 'Garlanding', types: ['GARLANDING'] },
                { id: 'PAGING_BOARD', label: 'Paging Board', types: ['PAGING_BOARD'] }
              ].map(opt => {
                const active = filters.ticketTypes.length === 1 && filters.ticketTypes[0] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFilters(f => ({ ...f, ticketTypes: opt.types }));
                      setReport(null);
                    }}
                    className={`rounded-lg py-2 px-1 text-center text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="mb-1.5 block">Date</span>
            <input
              type="date"
              value={filters.date}
              onChange={e => setFilter('date', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {/* Session ID */}
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="mb-1.5 block">Session ID</span>
            <select
              value={filters.shiftId}
              onChange={e => setFilter('shiftId', e.target.value)}
              disabled={sessionDisabled}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">{sessionDisabled ? 'Select date first' : 'Select session (optional)'}</option>
              {sessionsForDate.map(shift => (
                <option key={shift.id} value={shift.id}>#{shift.id} · {shift.shiftType} · {displayDate(shift.startAt)}</option>
              ))}
            </select>
          </label>

          {/* Deposit Slip No */}
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="mb-1.5 block">Deposit Slip No</span>
            <input
              type="text"
              value={filters.depositSlipNo}
              onChange={e => setFilter('depositSlipNo', e.target.value)}
              disabled={bankingDisabled}
              placeholder={
                bankingDisabled
                  ? (!canEditBankingInfo ? 'Read-only for super user' : 'Select date first')
                  : 'Enter deposit slip number'
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-normal placeholder:text-slate-400 text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>

          {/* Bank */}
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="mb-1.5 block">Bank</span>
            <input
              type="text"
              value={filters.bank}
              onChange={e => setFilter('bank', e.target.value)}
              disabled={bankingDisabled}
              placeholder={
                bankingDisabled
                  ? (!canEditBankingInfo ? 'Read-only for super user' : 'Select date first')
                  : 'Enter bank name'
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-normal placeholder:text-slate-400 text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>

          {/* Remark */}
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="mb-1.5 block">Remark</span>
            <input
              type="text"
              value={filters.remark}
              onChange={e => setFilter('remark', e.target.value)}
              disabled={bankingDisabled}
              placeholder={
                bankingDisabled
                  ? (!canEditBankingInfo ? 'Read-only for super user' : 'Select date first')
                  : 'Enter remark'
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-normal placeholder:text-slate-400 text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-60"
          >
            <Search size={17} />{loading ? 'Generating…' : 'Preview Report'}
          </button>
        </div>

        {/* Local Printer Panel */}
        <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Printer size={14} className="text-blue-600" />
              Direct Printer
            </span>
            <button
              type="button"
              onClick={refreshPrinters}
              disabled={printersLoading}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={11} className={printersLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <select
            value={printerName}
            onChange={event => setPrinterName(event.target.value)}
            disabled={printersLoading || !printers.some(printer => printer.available)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">{printersLoading ? 'Scanning printers...' : 'Select a connected printer'}</option>
            {printers.map(printer => (
              <option key={printer.name} value={printer.name} disabled={!printer.available}>
                {printer.name}{printer.available ? '' : ` (${printer.status})`}
              </option>
            ))}
          </select>

          {printerNotice && (
            <p className={`mt-2 rounded-xl p-2.5 text-[11px] font-medium leading-relaxed ${printerNotice.startsWith('Sales report sent') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
              {printerNotice}
            </p>
          )}

          <button
            type="button"
            onClick={printReport}
            disabled={!report || !printerName || printing || printersLoading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-black transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={15} />
            <span>{printing ? 'Sending to printer...' : 'Print Report'}</span>
          </button>
        </div>
      </form>

      <section className="sales-report-preview min-w-0 p-6 lg:p-7">
        <div className="sales-report-preview-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Report Preview</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              {report
                ? `Generated for ${report.shift ? `shift #${report.shift.id}` : report.date} (A4 Portrait)`
                : 'No data generated for preview. Select filters and click “Preview Report”.'}
            </p>
          </div>
          {report && (
            <div className="sales-report-actions flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                title="Print report using browser (A4 portrait)"
              >
                <Printer size={14} />
                <span>Browser Print</span>
              </button>
              <button
                type="button"
                onClick={preview}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                title="Refresh report"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!report && !error && (
          <div className="mt-6 flex min-h-[460px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-2xs border border-slate-200/70 text-slate-400 mb-3">
              <FileText size={26} />
            </div>
            <p className="text-sm font-bold text-slate-700">No data generated for preview</p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Select date and options on the left, then click <span className="font-semibold text-slate-600">“Preview Report”</span> to inspect the printable A4 document.
            </p>
          </div>
        )}
        {report && (
          <div className="mt-6 rounded-2xl bg-slate-100/60 p-4 sm:p-6 overflow-x-auto border border-slate-200/70">
            <ReportPreview report={report} />
          </div>
        )}
      </section>
    </div>
  </div>;
}

function ReportPreview({ report }) {
  const summary = getSessionReportSummary(report);
  const airport = report.airport || 'BIA';
  const users = report.users?.length ? report.users.join(', ') : '-';
  const sessionValue = report.shift?.id ?? report.date ?? '-';
  const reportTitle = report.ticketTypes?.length === 1
    ? report.ticketTypes[0] === 'PAGING_BOARD'
      ? 'PAGINGBOARD SESSION SUMMARY REPORT'
      : 'GARLANDING SESSION SUMMARY REPORT'
    : 'DEPARTURE ENTRY TICKET SESSION SUMMARY REPORT';

  return <article id="sales-report-print" className="sales-report-sheet mx-auto mt-5 w-full max-w-[210mm] min-h-[297mm] flex flex-col justify-between border border-slate-300 bg-white p-7 sm:p-10 text-[11px] leading-normal text-black shadow-lg">
    <div>
      <header className="text-center">
        <img id="sales-report-logo" src={aaslLogo} alt="AASL Logo" className="mx-auto mb-3 h-8 w-14 object-contain" />
        <h3 className="font-bold text-[12.5px]">Airport &amp; Aviation Services (Sri Lanka) (Private) Limited</h3>
        <p className="mt-0.5 text-[10.5px]">Bandaranaike International Airport</p>
        <p className="mt-0.5 text-[10px] text-slate-600">Katunayake</p>
        <h4 className="mt-3.5 text-xs font-bold uppercase tracking-wider">{reportTitle}</h4>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 border-y border-slate-200 py-3.5 text-[10.5px]">
        <ReportDetail label="Start Serial No" value={formatReportSerial(report.startSerialNo, airport, report.ticketTypes)} />
        <ReportDetail label="End Serial No" value={formatReportSerial(report.endSerialNo, airport, report.ticketTypes)} />
        <ReportDetail label="Start Date/Time" value={formatReportDate(report.shift?.startAt || report.date)} />
        <ReportDetail label="End Date/Time" value={formatReportDate(report.shift?.endAt || report.date)} />
        <ReportDetail label="No of Cancelled Tickets" value={report.cancelledTickets ?? 0} />
        <ReportDetail label="Session ID" value={sessionValue} />
        <ReportDetail label="No of Visitors" value={summary.totalQty} />
        <ReportDetail label="Ticket Type" value={(report.ticketTypes || []).map(type => type === 'PAGING_BOARD' ? 'Paging Board' : 'Garlanding').join(', ') || 'All'} />
        <ReportDetail label="User" value={users} />
        <ReportDetail label="Airport" value={airport} />
      </div>

      <ReportSectionTitle className="mt-5">1. Session &amp; Banking Summary</ReportSectionTitle>
      <ReportTable
        headers={['Session Total Income', 'Total Visitors / Tickets', 'Deposit Slip No', 'Bank', 'Remark']}
        rows={[[money(summary.totalAmount), summary.totalQty, report.depositSlipNo || '\u00a0', report.bank || '\u00a0', report.remark || '\u00a0']]}
        widths={['26%', '22%', '20%', '14%', '18%']}
      />

      <div className="mt-6 grid grid-cols-2 gap-4">
        <section>
          <ReportSectionTitle className="mt-0">2. System Ticket Sales</ReportSectionTitle>
          <ReportTable
            headers={['Sales Mode', 'No of Tickets', 'Amount (Rs)']}
            rows={[
              ['Cash Tickets', summary.system.cashQty, money(summary.system.cashAmount)],
              ['Credit Tickets', summary.system.creditQty, money(summary.system.creditAmount)],
              ['Subtotal (Tickets)', summary.system.ticketQty, money(summary.system.totalAmount)]
            ]}
            widths={['44%', '26%', '30%']}
            emphasizeLastRow
          />
        </section>
        <section>
          <ReportSectionTitle className="mt-0">3. Manual Ticket Sales</ReportSectionTitle>
          <ReportTable
            headers={['Sales Mode', 'No of Tickets', 'Amount (Rs)']}
            rows={[
              ['Manual Cash Sales', summary.manual.cashQty, money(summary.manual.cashAmount)],
              ['Manual Credit Sales', summary.manual.creditQty, money(summary.manual.creditAmount)],
              ['Subtotal (Manual)', summary.manual.cashQty + summary.manual.creditQty, money(summary.manual.cashAmount + summary.manual.creditAmount)]
            ]}
            widths={['44%', '26%', '30%']}
            emphasizeLastRow
          />
        </section>
      </div>

      <ReportSectionTitle className="mt-6">4. Total Sales &amp; Revenue Collection</ReportSectionTitle>
      <ReportTable
        headers={['Collection Method', 'Total Tickets / Visitors', 'Total Collection (Rs)']}
        rows={[
          ['Total Cash Collection (Tickets + Manual)', summary.cashQty, money(summary.cashAmount)],
          ['Total Credit Collection (Tickets + Manual)', summary.creditQty, money(summary.creditAmount)],
          ['Grand Total Revenue', summary.totalQty, money(summary.totalAmount)]
        ]}
        widths={['44%', '26%', '30%']}
        emphasizeLastRow
      />

      <p className="mt-6 text-[10.5px] text-slate-700">I do hereby declare that the above information to the best of my knowledge is true &amp; correct.</p>
      <div className="mt-8 max-w-sm space-y-6">
        <SignatureLine number="01" />
        <SignatureLine number="02" />
      </div>
    </div>

    <div>
      <div className="mt-14 mb-6 grid grid-cols-2 gap-16 text-center text-[10px]">
        <div className="px-4">
          <div className="h-6 border-b border-black" />
          <p className="mt-2 font-medium text-black">Name and Official Seal of the Supervisor</p>
        </div>
        <div className="px-4">
          <div className="h-6 border-b border-black" />
          <p className="mt-2 font-medium text-black">Signature of the Duty Officer</p>
        </div>
      </div>

      <div className="flex justify-between border-t border-slate-400 pt-2.5 text-[9.5px] text-slate-600">
        <span>Print Date/Time: {formatPrintDateTime(report.generatedAt)}</span>
        <span>1 of 1</span>
      </div>
    </div>
  </article>;
}

function formatPrintDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

function ReportDetail({ label, value }) {
  return (
    <div className="flex items-baseline min-w-0">
      <span className="w-36 shrink-0 font-medium text-slate-700">{label}</span>
      <span className="mr-2 font-bold text-slate-900">:</span>
      <span className="min-w-0 flex-1 font-semibold text-black break-words">{value}</span>
    </div>
  );
}

function ReportSectionTitle({ children, className = '' }) {
  return <h5 className={`mb-1.5 mt-3.5 text-[10px] font-bold uppercase tracking-wide text-slate-900 ${className}`}>{children}</h5>;
}

function ReportTable({ headers, rows, widths, emphasizeLastRow = false }) {
  return <table className="w-full table-fixed border-collapse text-center text-[9.5px]">
    <colgroup>{widths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
    <thead>
      <tr className="bg-slate-50">
        {headers.map(header => (
          <th key={header} className="border border-black px-2 py-2 font-bold text-black">
            {header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, rowIndex) => {
        const isBold = emphasizeLastRow && rowIndex === rows.length - 1;
        return (
          <tr key={rowIndex} className={isBold ? 'font-bold bg-slate-50/60' : ''}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="border border-black px-2 py-2 text-black">
                {cell || '\u00a0'}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  </table>;
}

function SignatureLine({ number }) {
  return <div>
    <div className="flex items-end gap-1.5">
      <span className="font-bold text-slate-800">{number}</span>
      <span className="mb-0.5 h-px flex-1 bg-black" />
    </div>
    <p className="ml-5 mt-0.5 text-[8.5px] text-slate-600">Name of ASA</p>
  </div>;
}
