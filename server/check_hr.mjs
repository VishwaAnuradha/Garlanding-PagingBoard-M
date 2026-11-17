import { getHrEmployeePool } from './config/db.js';

async function check() {
  const pool = getHrEmployeePool();
  await pool.connect();
  const res = await pool.request().query('SELECT * FROM dbo.Employee WHERE EmployeeNo IN (\'1001\', \'1002\', \'1003\', \'1004\', \'1005\')');
  console.log('Employees:', res.recordset);
  process.exit(0);
}
check();
