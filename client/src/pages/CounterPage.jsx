import { useEffect, useRef, useState, useCallback } from 'react';
import DailyTotals from '../components/DailyTotals';
import CloseSalesModal from '../components/CloseSalesModal';
import SaleForm from '../components/SaleForm';
import { useAuth } from '../context/AuthContext';
import { printTicketSilently, printSessionSummaryReceiptSilently } from '../utils/ticketPrinter';
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
  const [printerName, setPrinterName] = useState('');
  const [configuredInDb, setConfiguredInDb] = useState(false);
  const [printerStatus, setPrinterStatus] = useState('Checking...');
  const [isPrinterOnline, setIsPrinterOnline] = useState(false);
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

      // STRICT CHECK: Has a printer been configured in TSettings table?
      if (!data?.configuredInDb || !data?.configuredPrinter) {
        setPrinterName('');
        setConfiguredInDb(false);
        setPrinterStatus('Not Configured in TSettings');
        setIsPrinterOnline(false);
        return;
      }

      // Printer IS configured in TSettings:
      const configuredName = data.configuredPrinter;
      setPrinterName(configuredName);
      setConfiguredInDb(true);

      const found = list.find(p => p.name.toLowerCase() === configuredName.toLowerCase());
      const isOnline = Boolean(found && found.available !== false && found.status !== 'Not Connect' && found.status !== 'Offline');
      setPrinterStatus(isOnline ? 'Ready' : (found ? found.status || 'Not Connect' : 'Not Connect'));
      setIsPrinterOnline(isOnline);
    } catch {
      setPrinters([]);
      setConfiguredInDb(false);
      setPrinterName('');
      setPrinterStatus('Not Connect');
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
      const isOnline = found.available !== false && found.status !== 'Not Connect' && found.status !== 'Offline';
      setPrinterStatus(isOnline ? 'Ready' : 'Not Connect');
      setIsPrinterOnline(isOnline);
    }
  };

  useEffect(() => () => clearTimeout(successTimer.current), []);

  useEffect(() => { 
    getTodaySales().then(setSummary).catch(error => { 
      setMessageType('error');
      setMessage(error.message); 
    }); 
    fetchPrinters();
    const interval = setInterval(fetchPrinters, 5000);
    return () => clearInterval(interval);
  }, [fetchPrinters]);
  
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const selectTicketType = ticketType => { if (canSelectTicketType) 
    { setForm(current => ({ ...current, ticketType, flightNo: '' }));
     onTicketTypeChange?.(ticketType); setShowTicketMenu(false); } };

  const submit = async event => {
    event.preventDefault();
    if (readOnly || !form.flightNo.trim() || !form.company.trim() || summary.closed) return;
    if (!configuredInDb || !printerName) {
      setMessageType('error');
      setMessage('Printing disabled: No printer is configured in database [Garlanding_3].[dbo].[TSettings]. Please insert printer details into TSettings table first.');
      return;
    }

    setSaving(true);
    clearTimeout(successTimer.current);
    setMessage('');
    try {
      const { sale, summary: next } = await createSale(form);
      setSummary(next);
      const currentAirport = session?.user?.airport || session?.airport || 'BIA';
      const currentSessionId = sale?.sessionId || session?.user?.sessionId || session?.sessionId;
      const currentUserId = sale?.userId || session?.user?.epfNumber || session?.user?.ssn || session?.user?.userId || '';
      const saleToPrint = {
        ...sale,
        airport: sale?.airport || currentAirport,
        sessionId: currentSessionId,
        userId: currentUserId,
        ticketType: form.ticketType,
        paymentMethod: form.paymentMethod,
        credit: form.paymentMethod === 'CREDIT_CARD' ? 1 : (sale?.credit ?? 0),
      };
      setForm({ flightNo: '', company: '', ticketType: form.ticketType, qty: '1', paymentMethod: 'CASH', creditCardNo: '' });
      setMessage('');
      try {
        await printTicketSilently(saleToPrint, printerName);
        setMessageType('success');
        setMessage(`Ticket #${sale.serialNo ?? sale.id} printed successfully.`);
        successTimer.current = setTimeout(() => setMessage(''), 5000);
      } catch (printError) {
        // Automatic Error Ticket Recording when printer is disconnected or print fails
        const ticketNumber = sale.serialNo ?? sale.id;
        const reason = printError?.message ? ` (${printError.message})` : '';
        try {
          const voidResult = await voidTicket(sale.id, true);
          if (voidResult?.summary) setSummary(voidResult.summary);
          setMessageType('error');
          setMessage(`⚠️ Printer error${reason}`);
        } catch (voidError) {
          setMessageType('error');
          setMessage(`⚠️ Print failed${reason}`);
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
  const close = async details => { 
    if (readOnly) return; 
    setSaving(true); 
    try { 
      const result = await closeTodaySales(details); 

      // Print two session summary receipts: 1 for Garlanding, 1 for Paging Board
      const receipts = result?.sessionReceipts || [];
      for (const receipt of receipts) {
        try {
          await printSessionSummaryReceiptSilently(receipt, printerName);
        } catch (printErr) {
          console.warn(`Failed to print ${receipt.ticketType} summary receipt:`, printErr?.message);
        }
      }

      setShowCloseModal(false); 
      onLogout?.(); 
    } catch (error) { 
      clearTimeout(successTimer.current); 
      setMessageType('error'); 
      setMessage(error.message); 
    } finally { 
      setSaving(false); 
    } 
  };
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
          configuredInDb={configuredInDb}
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
