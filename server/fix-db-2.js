import 'dotenv/config';
import connectDatabase, { getPool } from './config/db.js';

console.log('Fixing database sessions again...');
connectDatabase()
  .then(async () => {
    const pool = getPool();
    await pool.request().query(`
      -- Close sessions 2 and 4
      UPDATE dbo.tblSESSION SET sessionStatus = 'CLOSED' WHERE sessionId IN (2, 4);
      -- Make sure 6 is active, since 5 was already closed
      UPDATE dbo.tblSESSION SET sessionStatus = 'ACTIVE', finalizedDateTime = GETDATE() WHERE sessionId = 6;
      -- Close any other active sessions just in case
      UPDATE dbo.tblSESSION SET sessionStatus = 'CLOSED' WHERE sessionStatus = 'ACTIVE' AND sessionId <> 6;
    `);
    console.log('Successfully updated sessions 2, 4, and 6!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Update failed:', error);
    process.exit(1);
  });
