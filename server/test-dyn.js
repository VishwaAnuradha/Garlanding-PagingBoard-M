import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const useWindowsAuthentication = String(process.env.SQL_AUTH_MODE || '').toLowerCase() === 'windows';

let sql;
if (useWindowsAuthentication) {
  sql = (await import('mssql/msnodesqlv8.js')).default;
} else {
  sql = (await import('mssql')).default;
}
console.log(sql ? 'Loaded' : 'Failed to load');
