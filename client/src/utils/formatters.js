export const money = (amount) => `Rs : ${Number(amount).toFixed(2)}`;
export const displayDate = () => new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
export const displayTime = (date = new Date()) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(date));

// The application stores and reports shift/sales times as business wall-clock time
// (Asia/Colombo by default, matching the server's BUSINESS_TIMEZONE). Formatting
// must stay pinned to that timezone so the displayed time never shifts with the
// browser's local timezone.
const BUSINESS_TIMEZONE = 'Asia/Colombo';

export const formatBusinessDateTime = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-LK', { timeZone: BUSINESS_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};
