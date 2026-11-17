import { getPoolForAirport } from './config/db.js';

async function check() {
  for (const airport of ['BIA', 'CIAR', 'JIA']) {
    try {
      const pool = getPoolForAirport(airport);
      await pool.connect();
      const res = await pool.request().query('SELECT UserID, Password, EmployeeNo, Category FROM dbo.USERS');
      console.log(`dbo.USERS in ${airport}:`, res.recordset);
    } catch (e) {
      console.log(`Error checking ${airport}:`, e.message);
    }
  }
  process.exit(0);
}
check();
