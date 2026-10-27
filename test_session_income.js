import connectDatabase, { getPool } from './server/config/db.js';

async function test() {
  await connectDatabase();
  const pool = getPool();
  const result = await pool.request().query('SELECT * FROM dbo.SESSIONINCOME');
  console.log("SESSIONINCOME rows:", result.recordset);
  process.exit(0);
}
test();
