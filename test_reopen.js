import connectDatabase, { getPool } from './server/config/db.js';

async function test() {
  await connectDatabase();
  const pool = getPool();
  const businessDate = '2026-08-23';
  const result = await pool.request().input('businessDate', businessDate)
    .query(`UPDATE dbo.SESSIONINCOME SET SESSION_END_DATETIME = NULL WHERE CONVERT(char(10), SESSION_START_DATETIME, 23) = @businessDate AND SESSION_END_DATETIME IS NOT NULL`);
  console.log("rowsAffected:", result.rowsAffected);
  process.exit(0);
}
test();
