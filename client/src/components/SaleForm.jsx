import { money } from '../utils/formatters';
import { Lock, Unlock, Printer, RefreshCw } from 'lucide-react';

const prices = { GARLANDING: 500, 'PAGING BOARD': 300 };

export default function SaleForm({ 
  form, 
  onChange, 
  onSubmit, 
  onClose, 
  onReopen, 
  closed, 
  readOnly = false, 
  saving, 
  message, 
  messageType = 'error',
  printerName = 'EPSON TM-T81III Receipt',
  printers = [],
  printerStatus = 'Ready',
  isPrinterOnline = true,
  printersLoading = false,
  onPrinterChange,
  onRefreshPrinters
}) {
  const disabled = closed || saving || readOnly;
  const amount = prices[form.ticketType] * Number(form.qty);
  const referenceLabel = form.ticketType === 'PAGING BOARD' ? 'Serial No' : 'Flight No';
  const isCreditCard = form.paymentMethod === 'CREDIT_CARD';
  const qrPayload = JSON.stringify({ referenceNo: form.flightNo, company: form.company, ticketType: form.ticketType, quantity: form.qty, amount });
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&format=png&data=${encodeURIComponent(qrPayload)}`;
  
  return <form onSubmit={onSubmit} className="px-3 sm:px-5">
    <Field label={`${referenceLabel} *`}><input autoFocus value={form.flightNo} disabled={disabled} onChange={e => onChange('flightNo', e.target.value)} className="counter-input w-40 transition-colors focus:border-[#2d7ab5] focus:ring-1 focus:ring-[#2d7ab5]" required /></Field>
    <Field label="Company *" top><textarea rows="3" value={form.company} disabled={disabled} onChange={e => onChange('company', e.target.value)} className="counter-input w-full resize-y transition-colors focus:border-[#2d7ab5] focus:ring-1 focus:ring-[#2d7ab5]" required /></Field>
    
    <div className="relative">
      <div className="mb-3 grid grid-cols-[90px_1fr_35px_60px] items-center gap-2 sm:grid-cols-[110px_136px_37px_60px]">
        <label>Ticket Type</label><output className="counter-input bg-zinc-200 text-zinc-600">{form.ticketType}</output>
        <label className="text-right font-bold">Qty</label>
        <select value="1" disabled className="counter-input cursor-not-allowed bg-zinc-200 text-zinc-600" > <option value="1">01</option> </select>
      </div>
      <img src={qrCodeUrl} alt="Ticket QR code" className="absolute right-0 top-2 h-[110px] w-[110px] border border-zinc-300 bg-white p-1" />
    </div>
    
    <div className="amount-line"><span>Amount</span><b>{money(amount)}</b></div>
    <div className="amount-line text-green-600"><span className="text-black">Total Amount</span><b className="text-base">{money(amount)}</b></div>

    <label className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-700">
      <input
        type="checkbox"
        checked={isCreditCard}
        onChange={e => onChange('paymentMethod', e.target.checked ? 'CREDIT_CARD' : 'CASH')}
        disabled={disabled}
        aria-label="Credit Card"
        className="h-4 w-4 cursor-pointer rounded-sm border border-zinc-400 bg-white text-[#2d7ab5] accent-[#2d7ab5] focus:outline-none focus:ring-2 focus:ring-[#2d7ab5] focus:ring-offset-2"
      />
      Credit Card
    </label>
    
    {/* Printer machine name display - positioned above Close Sales button and below Credit Card button */}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white/90 px-3 py-2 text-xs sm:text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Printer size={16} className="text-[#2d7ab5] shrink-0" />
        <span className="font-semibold text-zinc-700 shrink-0">Printer:</span>
        {printers && printers.length > 1 ? (
          <select
            value={printerName}
            onChange={e => onPrinterChange?.(e.target.value)}
            disabled={true}
            aria-label="Select printer machine"
            className="max-w-[210px] truncate rounded border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 shadow-xs cursor-not-allowed opacity-80"
          >
            {printers.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} {p.available === false ? '(Offline)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-medium text-zinc-900 truncate" title={printerName}>
            {printerName || 'EPSON TM-T81III Receipt'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
          isPrinterOnline 
            ? 'bg-emerald-100 text-emerald-800' 
            : 'bg-rose-100 text-rose-800'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isPrinterOnline ? 'bg-emerald-600' : 'bg-rose-600'}`} />
          {isPrinterOnline ? 'Ready' : (printerStatus && printerStatus !== 'Offline' ? printerStatus : 'Not Connect')}
        </span>
        {onRefreshPrinters && (
          <button
            type="button"
            onClick={onRefreshPrinters}
            title="Refresh printer status"
            disabled={printersLoading}
            className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
          >
            <RefreshCw size={13} className={printersLoading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </div>
    
    {message && (
      <p
        title={message}
        className={`mt-3 truncate rounded-md border px-3 py-2 text-xs sm:text-sm font-semibold ${
          messageType === 'success'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : messageType === 'warning'
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-red-300 bg-red-50 text-red-800'
        }`}
        role={messageType === 'success' ? 'status' : 'alert'}
        aria-live="polite"
      >
        {message}
      </p>
    )}
    
    <div className="mt-2 flex items-center justify-between gap-4">
      {closed ? (
        <button 
          disabled={saving || readOnly} 
          type="button" 
          onClick={onReopen} 
          className="group flex h-11 items-center justify-center gap-2 rounded-md border border-emerald-600 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          <Unlock size={16} className="transition-transform group-hover:scale-110" />
          Reopen Sales
        </button>
      ) : (
        <button 
          disabled={disabled} 
          type="button" 
          onClick={onClose} 
          className="group flex h-11 items-center justify-center gap-2 rounded-md border border-rose-600 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-600 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          <Lock size={16} className="transition-transform group-hover:scale-110" />
          Close Sales
        </button>
      )}
      
      <button 
        disabled={!form.flightNo.trim() || !form.company.trim() || disabled} 
        className="group flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[#1d5f93] bg-[#2d7ab5] text-base font-medium text-white shadow-sm transition-all hover:bg-[#1d5f93] hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:border-zinc-400 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
      >
        <Printer size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:scale-110" />
        {saving ? 'Saving...' : 'Print'}
      </button>
    </div>
  </form>;
}
function Field({ label, top, children }) { return <div className={`mb-3 grid grid-cols-[90px_1fr] gap-2 sm:grid-cols-[110px_1fr] ${top ? 'items-start' : 'items-center'}`}><label className={top ? 'pt-1' : ''}>{label}</label>{children}</div>; }
