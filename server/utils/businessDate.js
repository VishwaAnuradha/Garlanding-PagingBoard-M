const timezone = process.env.BUSINESS_TIMEZONE || 'Asia/Colombo';

export const BUSINESS_TIMEZONE = timezone;

const pad = value => String(value).padStart(2, '0');

export const getBusinessDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());

// Return the UTC offset (e.g. "+05:30") of the business timezone at the supplied instant.
function businessOffset(date) {
  const part = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find(p => p.type === 'timeZoneName');
  const match = (part?.value || '').match(/(?:GMT|UTC)([+-]\d{2}:\d{2})/);
  return match ? match[1] : '+00:00';
}

// SQL Server DATETIME stores a wall-clock value (business time) with no timezone.
// The mssql driver reads it as a JS Date built from those wall-clock fields in the
// server process's local timezone, and res.json() would then serialize it to a UTC
// string - losing the intended business wall-clock time. Re-tag the wall-clock
// fields with the business timezone offset so the value is unambiguous to the
// client regardless of the server's or browser's local timezone.
export function toBusinessDateTime(value) {
  if (value === null || value === undefined) return value;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.valueOf())) return value;
  const wallClock = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${wallClock}${businessOffset(d)}`;
}
