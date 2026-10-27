import { useState } from 'react';
import { money } from '../utils/formatters';

const datetimeLocal = value => {

  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date - offset).toISOString().slice(0, 16);
};

const quantityFields = [
  ['Garlanding Cash Quantity', 'manualGarlandingCashQty'],
  ['Garlanding Credit Quantity', 'manualGarlandingCreditQty'],
  ['Paging Board Cash Quantity', 'manualPagingBoardCashQty'],
  ['Paging Board Credit Quantity', 'manualPagingBoardCreditQty'],
];

export default function CloseSalesModal({ sales, onCancel, onConfirm, saving }) {
  const firstSale = sales.length ? sales[sales.length - 1].createdAt : new Date();

  const [manualEntry, setManualEntry] = useState(false);

  const [sessionStartedAt, setSessionStartedAt] = useState(datetimeLocal(firstSale));

  const [sessionEndedAt, setSessionEndedAt] = useState(datetimeLocal());

  const [quantities, setQuantities] = useState({

    manualGarlandingCashQty: '', manualGarlandingCreditQty: '',
    manualPagingBoardCashQty: '', manualPagingBoardCreditQty: '',

  });
  const [error, setError] = useState('');

  const values = Object.fromEntries(Object.entries(quantities).map(([key, value]) => [key, Number(value || 0)]));

  const hasManualInput = manualEntry && Object.values(quantities).every(value => value !== '');

  const validQuantities = Object.values(values).every(value => Number.isInteger(value) && value >= 0 && value <= 9999);

  const submit = event => {

    event.preventDefault();
    if (manualEntry && (!hasManualInput || !validQuantities)) {
      setError('Enter whole-number cash and credit quantities for both ticket types.');
      return;
    }
    onConfirm({ sessionStartedAt, sessionEndedAt, ...(manualEntry ? values : Object.fromEntries(Object.keys(values).map(key => [key, 0]))) });
  };

  const updateQuantity = (key, value) => setQuantities(current => ({ ...current, [key]: value }));
  
  const amounts = {
    garlandingCash: values.manualGarlandingCashQty * 500,
    garlandingCredit: values.manualGarlandingCreditQty * 500,
    pagingBoardCash: values.manualPagingBoardCashQty * 300,
    pagingBoardCredit: values.manualPagingBoardCreditQty * 300,
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="close-sales-title">
    <form onSubmit={submit} className="w-full max-w-2xl border border-zinc-500 bg-white shadow-xl">
      <div className="flex items-center justify-between bg-zinc-700 px-4 py-2 text-sm font-bold text-white">
        <h2 id="close-sales-title">MANUAL SALES INFORMATION</h2>
        <button type="button" onClick={onCancel} aria-label="Close dialog">

          ×

        </button>
      </div>

      <div className="p-5">

        <label className="mb-4 flex w-fit items-center gap-2">

          <input type="checkbox" checked={manualEntry} onChange={event => { setManualEntry(event.target.checked); setError(''); }} /> Insert Manual Sale

        </label>

        <div className="grid gap-x-7 gap-y-4 sm:grid-cols-2">

          <Field label="Session Start Date/Time">

            <input type="datetime-local" value={sessionStartedAt} onChange={event => setSessionStartedAt(event.target.value)} disabled className="counter-input w-full" required />

          </Field>
          
          <Field label="Session End Date/Time">

            <input type="datetime-local" value={sessionEndedAt} onChange={event => setSessionEndedAt(event.target.value)} disabled className="counter-input w-full" required />

          </Field>
          
          {quantityFields.map(([label, key]) => <Field key={key} label={label}>

            <input type="number" min="0" max="9999" value={quantities[key]} onChange={event => updateQuantity(key, event.target.value)} disabled={!manualEntry} className="counter-input w-full" placeholder="0" /></Field>)}
            
            <Field label="Garlanding Cash Amount">

              <Amount value={amounts.garlandingCash} enabled={manualEntry} />

              </Field>
              
              <Field label="Garlanding Credit Amount">
                
                <Amount value={amounts.garlandingCredit} enabled={manualEntry} />
                
                </Field>

                <Field label="Paging Board Cash Amount">

                  <Amount value={amounts.pagingBoardCash} enabled={manualEntry} />
                  
                  </Field>
                  
                  <Field label="Paging Board Credit Amount">
                    
                    <Amount value={amounts.pagingBoardCredit} enabled={manualEntry} />

                    </Field>
                    
                    </div>

        <p className="mt-4 min-h-4 text-xs text-red-700" aria-live="polite">{error}</p>

        <p className="text-xs text-zinc-500">Use manual entry only to add tickets sold while the system was unavailable, for example after a power interruption.
        </p>
        <div className="mt-5 flex justify-end gap-3">

          <button type="button" onClick={onCancel} className="border border-zinc-400 px-5 py-2">Cancel

          </button>
          
          <button type="submit" disabled={saving || (manualEntry && !hasManualInput)} 

          className={`relative overflow-hidden rounded-md border px-5 py-2 font-semibold tracking-wide

           text-white shadow-md transition-all duration-300 ${saving ? 
            
            'animate-pulse border-blue-500 bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500 shadow-blue-200' : manualEntry && hasManualInput ? 

           'border-blue-700 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 shadow-lg shadow-blue-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-200'
           
           : 'border-zinc-300 bg-zinc-200 text-zinc-500 shadow-none'} disabled:cursor-not-allowed disabled:opacity-70`}>
            
            {saving ? 'Closing...' : 'Close Sales'}
          
          </button>

        </div>

      </div>

    </form>

  </div>;
}

function Field({ label, children }) { return <div>

  <label className="mb-1 block text-xs text-zinc-600">{label}</label>

  {children}</div>; }

function Amount({ value, enabled }) { return <>

<output className="block border border-zinc-300 bg-zinc-100 px-3 py-2 font-bold text-zinc-700">

  {money(enabled ? value : 0)}

  </output>
  
  </>; }
