import 'dotenv/config';
import connectDatabase, { getPool } from './config/db.js';

console.log('Fixing database sessions...');
connectDatabase()
  .then(async () => {
    const pool = getPool();
    await pool.request().query(`
      -- Set all future sessions to pending (NULL in DB)
      UPDATE dbo.tblSESSION SET sessionStatus = NULL WHERE sessionId >= 6;
      -- Set the current session to active
      UPDATE dbo.tblSESSION SET sessionStatus = 'ACTIVE' WHERE sessionId = 5;
    `);
    console.log('Successfully updated sessions!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Update failed:', error);
    process.exit(1);
  });
