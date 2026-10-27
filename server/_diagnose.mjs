import connectDatabase, { getPool } from './config/db.js';
import { getDaySummary } from './services/salesService.js';
import { getBusinessDate } from './utils/businessDate.js';

console.log('businessDate =', getBusinessDate());
await connectDatabase();
try {
  console.log('-> calling getDaySummary...');
  const s = await getDaySummary(getBusinessDate());
  console.log('SUMMARY OK:', JSON.stringify(s));
} catch (e) {
  console.error('SUMMARY FAILED:', e.message);
}
try {
  const r = await getPool().request().query('SELECT 1 AS one');
  console.log('simple query OK:', r.recordset);
} catch (e) {
  console.error('SIMPLE QUERY FAILED:', e.message);
}
process.exit(0);