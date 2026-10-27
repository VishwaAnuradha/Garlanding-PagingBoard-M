import { useEffect, useRef, useState, useCallback } from 'react';
import DailyTotals from '../components/DailyTotals';
import CloseSalesModal from '../components/CloseSalesModal';
import SaleForm from '../components/SaleForm';
import { useAuth } from '../context/AuthContext';
import { printTicketSilently } from '../utils/ticketPrinter';
import useClock from '../hooks/useClock';
import { closeTodaySales, createSale, getTodaySales, reopenTodaySales, voidTicket } from '../services/salesService';
import { getLocalPrinters } from '../services/localPrintService';

const emptySummary = { sales: [], totals: { tickets: 0, items: 0, amount: 0 }, closed: false };

export default function CounterPage({ readOnly = false, onTicketTypeChange, onLogout }) {
  const { session } = useAuth();
  const [summary, setSummary] = useState(emptySummary); 

  const [form, setForm] = useState({ flightNo: '', company: '', ticketType: 'GARLANDING', qty: '1', paymentMethod: 'CASH', creditCardNo: '' });

  const [message, setMessage] = useState(''); 

  const [messageType, setMessageType] = useState('error'); 

  const [saving, setSaving] = useState(false);

  const [showCloseModal, setShowCloseModal] = useState(false);

  const [showTicketMenu, setShowTicketMenu] = useState(false); 

  const [printers, setPrinters] = useState([]);
  const [printerName, setPrinterName] = useState(() => localStorage.getItem('selected_printer') || 'EPSON TM-T81III Receipt');
  const [printerStatus, setPrinterStatus] = useState('Checking...');
  const [isPrinterOnline, setIsPrinterOnline] = useState(true);
  const [printersLoading, setPrintersLoading] = useState(false);

  const clock = useClock();

  const canSelectTicketType = true;

  const successTimer = useRef(null);

  const fetchPrinters = useCallback(async () => {
    setPrintersLoading(true);
    try {
      const data = await getLocalPrinters();
      const list = data?.printers || [];
      setPrinters(list);

      const saved = localStorage.getItem('selected_printer');
      const savedPrinter = list.find(p => p.name === saved);
      const epsonPrinter = list.find(p => /epson|tm-t81|receipt/i.test(p.name));
      const defaultP = list.find(p => p.name === data?.defaultPrinter);
      const active = savedPrinter || epsonPrinter || defaultP || list[0];

      if (active) {
        setPrinterName(active.name);
        setPrinterStatus(active.status || (active.available ? 'Ready' : 'Offline'));
        setIsPrinterOnline(active.available !== false);
      } else if (data?.defaultPrinter) {
        setPrinterName(data.defaultPrinter);
        setPrinterStatus('Ready');
        setIsPrinterOnline(true);
      } else {
        setPrinterName('EPSON TM-T81III Receipt');
        setPrinterStatus('Ready');
        setIsPrinterOnline(true);
      }
    } catch {
      setPrinters([]);
      setPrinterStatus('Service offline');
      setIsPrinterOnline(false);
    } finally {
      setPrintersLoading(false);
    }
  }, []);

  const handlePrinterChange = (name) => {
    setPrinterName(name);
    localStorage.setItem('selected_printer', name);
    const found = printers.find(p => p.name === name);
    if (found) {
      setPrinterStatus(found.status || (found.available ? 'Ready' : 'Offline'));
      setIsPrinterOnline(found.available !== false);
    }
  };

  useEffect(() => () => clearTimeout(successTimer.current), []);

  useEffect(() => { 
    getTodaySales().then(setSummary).catch(error => { 
      setMessageType('error');
      setMessage(error.message); 
    }); 
    fetchPrinters();
  }, [fetchPrinters]);
  
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const selectTicketType = ticketType => { if (canSelectTicketType) 
    { setForm(current => ({ ...current, ticketType, flightNo: '' }));
     onTicketTypeChange?.(ticketType); setShowTicketMenu(false); } };

  const submit = async event => {
    event.preventDefault();
    if (readOnly || !form.flightNo.trim() || !form.company.trim() || summary.closed) return;

    setSaving(true);
    clearTimeout(successTimer.current);
    setMessage('');
    try {
      const { sale, summary: next } = await createSale(form);
      setSummary(next);
      setForm({ flightNo: '', company: '', ticketType: form.ticketType, qty: '1', paymentMethod: 'CASH', creditCardNo: '' });
      setMessage('');
      try {
        await printTicketSilently(sale, printerName);
        setMessageType('success');
        setMessage(`Ticket #${sale.serialNo ?? sale.id} printed successfully.`);
        successTimer.current = setTimeout(() => setMessage(''), 5000);
      } catch (printError) {
        // Automatic Error Ticket Recording when printer is disconnected or print fails
        const ticketNumber = sale.serialNo ?? sale.id;
        try {
          const voidResult = await voidTicket(sale.id, true);
          if (voidResult?.summary) setSummary(voidResult.summary);
          setMessageType('error');
          setMessage(`⚠️ Printer offline: Ticket #${ticketNumber} saved to Error Ticketing.`);
        } catch (voidError) {
          setMessageType('error');
          setMessage(`⚠️ Print failed: Ticket #${ticketNumber} could not be saved.`);
        }
      }
    } catch (error) {
      clearTimeout(successTimer.current);
      setMessageType('error');
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };
  const close = async details => { if (readOnly) return; setSaving(true); try { await closeTodaySales(details); setShowCloseModal(false); onLogout?.(); } catch (error) { clearTimeout(successTimer.current); setMessageType('error'); setMessage(error.message); } finally { setSaving(false); } };
  const reopen = async () => { if (readOnly || !window.confirm('Reopen today’s sales?')) return; setSaving(true); try { setSummary(await reopenTodaySales()); } catch (error) { clearTimeout(successTimer.current); setMessageType('error'); setMessage(error.message); } finally { setSaving(false); } };
  return <>
  <section className="bg-[#f0f0f0] p-2">{readOnly && 
    <p className="mb-3 border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">Administrator view — counter inputs are read-only.</p>}
    <div className="relative w-full sm:w-[60%]">
      <div className="flex h-14 items-center justify-between border-2 border-[#ca6500] bg-[#ff8a00] pl-3 text-xl text-white">
        <span>{form.ticketType}</span>

      <button type="button" disabled={!canSelectTicketType} onClick={() => setShowTicketMenu(open => !open)} className="h-full border-l-2 border-white bg-red-600 px-3 disabled:bg-red-400">◀</button>
      </div>
      {showTicketMenu && <div className="absolute z-30 w-full border bg-white"><button type="button" onClick={() => selectTicketType('GARLANDING')} className="block w-full px-4 py-3 text-left">GARLANDING</button>
      <button type="button" onClick={() => selectTicketType('PAGING BOARD')} className="block w-full border-t px-4 py-3 text-left">PAGING BOARD</button></div>}</div>
      <div className="grid grid-cols-1 pt-5 md:grid-cols-[62%_38%]">

        <SaleForm 
          form={form} 
          onChange={change} 
          onSubmit={submit} 
          onClose={() => setShowCloseModal(true)} 
          onReopen={reopen} 
          closed={summary.closed} 
          readOnly={readOnly} 
          saving={saving} 
          message={message} 
          messageType={messageType} 
          printerName={printerName}
          printers={printers}
          printerStatus={printerStatus}
          isPrinterOnline={isPrinterOnline}
          printersLoading={printersLoading}
          onPrinterChange={handlePrinterChange}
          onRefreshPrinters={fetchPrinters}
        />

          <DailyTotals totals={summary.totals} sales={summary.sales} ticketType={form.ticketType} clock={clock} />
          </div>
          </section>{showCloseModal && !readOnly &&
          <CloseSalesModal sales={summary.sales} onCancel={() => setShowCloseModal(false)} onConfirm={close} saving={saving} />}
          </>;
}
