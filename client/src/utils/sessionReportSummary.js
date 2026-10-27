const asNumber = value => Number(value || 0);

export const formatReportMoney = value => `Rs: ${asNumber(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function formatReportSerial(serial, airport = 'BIA', prefix = 'AG') {
  if (serial == null) return '-';
  const resolvedPrefix = Array.isArray(prefix)
    ? (prefix.length === 1 && prefix[0] === 'PAGING_BOARD' ? 'AP' : 'AG')
    : (prefix === 'PAGING_BOARD' || prefix === 'PAGING BOARD' || prefix === 'AP' ? 'AP' : 'AG');
  return `${airport} - ${resolvedPrefix}${String(serial).padStart(8, '0')}`;
}

export function formatReportDate(value) {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll('-', '/');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(value));
  const part = type => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}/${part('month')}/${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`;
}

export function getSessionReportSummary(report) {
  const tickets = (report.tickets || []).filter(ticket => String(ticket.flightNo || '').toUpperCase() !== 'MANUAL SALE');
  const system = tickets.reduce((summary, ticket) => {
    const isCredit = Number(ticket.credit) === 1 || ticket.credit === true;
    const qty = asNumber(ticket.qty);
    const amount = asNumber(ticket.amount);
    const isGarlanding = ticket.ticketType === 'Garlanding' || ticket.ticketTypeId === 1;
    summary.ticketQty += qty;
    summary.totalAmount += amount;
    if (isCredit) {
      summary.creditQty += qty;
      summary.creditAmount += amount;
    } else {
      summary.cashQty += qty;
      summary.cashAmount += amount;
    }
    const typeKey = isGarlanding ? 'garlanding' : 'pagingBoard';
    summary.byType[typeKey].qty += qty;
    summary.byType[typeKey].amount += amount;
    return summary;
  }, { ticketQty: 0, totalAmount: 0, cashQty: 0, cashAmount: 0, creditQty: 0, creditAmount: 0, byType: { garlanding: { qty: 0, amount: 0 }, pagingBoard: { qty: 0, amount: 0 } } });

  const manual = (report.manualSales || []).reduce((summary, sale) => {
    const isGarlanding = Number(sale.ticketType) === 1;
    const cQty = asNumber(sale.cashQty);
    const cAmount = asNumber(sale.cashAmount);
    const crQty = asNumber(sale.creditQty);
    const crAmount = asNumber(sale.creditAmount);
    summary.cashQty += cQty;
    summary.cashAmount += cAmount;
    summary.creditQty += crQty;
    summary.creditAmount += crAmount;
    const typeKey = isGarlanding ? 'garlanding' : 'pagingBoard';
    summary.byType[typeKey].qty += cQty + crQty;
    summary.byType[typeKey].amount += cAmount + crAmount;
    return summary;
  }, { cashQty: 0, cashAmount: 0, creditQty: 0, creditAmount: 0, byType: { garlanding: { qty: 0, amount: 0 }, pagingBoard: { qty: 0, amount: 0 } } });

  const cashQty = system.cashQty + manual.cashQty;
  const creditQty = system.creditQty + manual.creditQty;
  const cashAmount = system.cashAmount + manual.cashAmount;
  const creditAmount = system.creditAmount + manual.creditAmount;

  const byType = {
    garlanding: {
      qty: system.byType.garlanding.qty + manual.byType.garlanding.qty,
      amount: system.byType.garlanding.amount + manual.byType.garlanding.amount
    },
    pagingBoard: {
      qty: system.byType.pagingBoard.qty + manual.byType.pagingBoard.qty,
      amount: system.byType.pagingBoard.amount + manual.byType.pagingBoard.amount
    }
  };

  return {
    system,
    manual,
    cashQty,
    creditQty,
    cashAmount,
    creditAmount,
    totalQty: cashQty + creditQty,
    totalAmount: cashAmount + creditAmount,
    byType
  };
}
