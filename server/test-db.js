import 'dotenv/config';
import connectDatabase, { getPool } from './config/db.js';

console.log('Testing connection...');
connectDatabase()
  .then(() => {
    console.log('Successfully connected to SQL Server!');
    return getPool().request().query('SELECT TOP 1 * FROM dbo.tblSESSION');
  })
  .then(result => {
    console.log(Object.keys(result.recordset.columns));
    process.exit(0);
  })
  .catch(error => {
    console.error('Connection failed:', error);
    process.exit(1);
  });
