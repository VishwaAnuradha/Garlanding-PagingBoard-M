import 'dotenv/config';
import connectDatabase, { getPool, sql } from './config/db.js';

await connectDatabase();
const pool = getPool();
try {
  await pool.request()
    .input('systemName', 'Garlanding Ticket Counter').input('counterName', 'Arrival Counter').input('printerName', 'X')
    .input('garlandingPrice', sql.Decimal(18, 2), 500).input('pagingBoardPrice', sql.Decimal(18, 2), 300)
    .query(`MERGE dbo.tblSettings AS target USING (SELECT 1 AS Id) AS source ON target.Id = source.Id
        WHEN MATCHED THEN UPDATE SET SystemName = @systemName, CounterName = @counterName, PrinterName = @printerName, GarlandingPrice = @garlandingPrice, PagingBoardPrice = @pagingBoardPrice, UpdatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (Id, SystemName, CounterName, PrinterName, GarlandingPrice, PagingBoardPrice) VALUES (1, @systemName, @counterName, @printerName, @garlandingPrice, @pagingBoardPrice);`);
  console.log('MERGE OK');
} catch (e) {
  console.log('MERGE FAILED number=' + e.number + ':', e.message.split('\n')[0]);
}
process.exit(0);