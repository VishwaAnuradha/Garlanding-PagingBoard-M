import 'dotenv/config';
import { getPool } from './config/db.js';

const pool = getPool();
await pool.connect();
const cols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tblSettings' ORDER BY ORDINAL_POSITION");
console.log('tblSettings COLUMNS:', JSON.stringify(cols.recordset));
const s = await pool.request().query('SELECT TOP 1 Id, SystemName, CounterName, PrinterName, GarlandingPrice, PagingBoardPrice, UpdatedAt FROM dbo.tblSettings WHERE Id = 1');
console.log('settings row:', JSON.stringify(s.recordset[0]));
process.exit(0);