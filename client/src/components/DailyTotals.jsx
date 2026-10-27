import { displayDate, money } from '../utils/formatters';

export default function DailyTotals({ totals, sales = [], clock, ticketType = 'GARLANDING' }) {
  const selectedType = ticketType === 'PAGING BOARD' ? 'PAGING BOARD' : 'GARLANDING';
  const filteredSales = (sales || []).filter(sale => {
    const saleType = sale.ticketType === 2 || sale.ticketType === 3 || sale.ticketType === 'PAGING BOARD' ? 'PAGING BOARD' : 'GARLANDING';
    return saleType === selectedType;
  });

  const selectedTotals = filteredSales.reduce((acc, sale) => {
    const isCredit = sale.credit === 1 || sale.credit === true || sale.credit === '1';
    const amount = Number(sale.amount || 0);
    const qty = Number(sale.qty || 0);
    return {
      tickets: acc.tickets + 1,
      items: acc.items + qty,
      amount: acc.amount + amount,
      cashTickets: acc.cashTickets + (isCredit ? 0 : 1),
      creditTickets: acc.creditTickets + (isCredit ? 1 : 0),
      cashAmount: acc.cashAmount + (isCredit ? 0 : amount),
      creditAmount: acc.creditAmount + (isCredit ? amount : 0),
    };
  }, { tickets: 0, items: 0, amount: 0, cashTickets: 0, creditTickets: 0, cashAmount: 0, creditAmount: 0 });

  const displayTotals = selectedTotals;

  return (
    <aside className="mt-5 border-t border-zinc-300 px-5 pt-4 md:mt-0 md:border-0 md:pt-0">
      <dl className="space-y-1.5">
        <Stat label="Date" value={displayDate()} />
        <Stat label="Time" value={clock} big />
        <div className="my-2 border-t border-zinc-200" />
        <Stat label="No of Tickets" value={displayTotals.tickets} bold />
        <div className="my-2 border-t border-zinc-200" />
        <Stat label="Cash Tickets" value={displayTotals.cashTickets} bold />
        <Stat label="Credit Tickets" value={displayTotals.creditTickets} bold />
        <Stat label="Cash Amount" value={money(displayTotals.cashAmount)} green alignRight />
        <Stat label="Credit Amount" value={money(displayTotals.creditAmount)} blue alignRight />
        <div className="my-2 border-t border-zinc-200" />
        <Stat label="Selected Total" value={money(displayTotals.amount)} orange alignRight />
      </dl>
    </aside>
  );
}

function Stat({ label, value, big, bold, orange, green, blue, alignRight }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center">
      <dt className="text-zinc-700 font-medium">{label}</dt>
      <dd className={`
        ${alignRight ? 'text-right' : ''}
        ${big ? 'text-2xl text-zinc-600' : ''} 
        ${bold ? 'text-lg font-bold text-zinc-800' : ''} 
        ${green ? 'font-bold text-emerald-700' : ''}
        ${blue ? 'font-bold text-blue-700' : ''}
        ${orange ? 'whitespace-nowrap text-2xl font-bold text-[#ff3d00]' : ''}
      `}>
        {value}
      </dd>
    </div>
  );
}
