import { getPoolForAirport, sql } from '../config/db.js';
import { getDaySummary } from '../services/salesService.js';
import { getBusinessDate, toBusinessDateTime } from '../utils/businessDate.js';
import { syncSessionToIfs } from '../services/ifsSyncService.js';

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

async function getTicketPrices(pool) {
  try {
    const result = await pool.request().query('SELECT TOP 1 GarlandingPrice, PagingBoardPrice FROM dbo.tblSettings WHERE Id = 1');
    const row = result.recordset[0];
    return row ? { GARLANDING: Number(row.GarlandingPrice), 'PAGING BOARD': Number(row.PagingBoardPrice) } : { GARLANDING: 500, 'PAGING BOARD': 300 };
  } catch (error) {
    // Settings are optional until the admin settings table is created in SQL Server.
    if (error.number === 208 || error.number === 207) return { GARLANDING: 500, 'PAGING BOARD': 300 };
    throw error;
  }
}

async function isClosed(pool, businessDate, sessionId) {
  const result = await pool.request().input('businessDate', businessDate).input('sessionId', sessionId ?? null).query(
    `SELECT TOP 1 CASE WHEN SESSION_END_DATETIME IS NOT NULL THEN 1 ELSE 0 END AS closed
     FROM dbo.SESSIONINCOME
     WHERE (${sessionId ? 'SessionId = @sessionId' : 'CONVERT(char(10), SESSION_START_DATETIME, 23) = @businessDate'})
     ORDER BY SESSION_START_DATETIME DESC`);
  return Boolean(result.recordset[0]?.closed);
}

export function normalizePaymentFlag(paymentValue) {
  if (paymentValue === true || paymentValue === 'true' || paymentValue === 'CARD' || paymentValue === 'CREDIT_CARD' || paymentValue === 'CREDIT') return 1;
  if (paymentValue === false || paymentValue === 'false' || paymentValue === 'CASH' || paymentValue === null || paymentValue === undefined || paymentValue === '') return 0;
  const value = Number(paymentValue);
  if (Number.isFinite(value)) return value ? 1 : 0;
  return 0;
}

async function ensurePaymentColumns(pool) {
  const tables = ['dbo.TICKETING_C', 'dbo.TICKETING_G', 'dbo.TICKETING_P'];
  for (const table of tables) {
    const check = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = '${table.split('.').pop()}' AND COLUMN_NAME = 'CREDIT'`);
    if (!check.recordset.length) {
      await pool.request().query(`ALTER TABLE ${table} ADD CREDIT INT NOT NULL CONSTRAINT DF_${table.split('.').pop()}_CREDIT DEFAULT 0;`);
    }
  }
}

export async function getTodaySales(req, res) 
{ const pool = getPoolForAirport(req.user?.airport || 'BIA'); res.json(await getDaySummary(getBusinessDate(), req.user?.sessionId, pool)); }

export async function createSale(req, res) {
  const operatorId = String(req.user?.epfNumber || '').trim();
  if (!operatorId) return res.status(401).json({ message: 'A verified operator identity is required to record a sale.' });
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  await ensurePaymentColumns(pool);
  const businessDate = getBusinessDate();
  const flightNo = String(req.body.flightNo || '').trim().toUpperCase();
  const company = String(req.body.company || '').trim();
  const qty = Number(req.body.qty);
  const ticketType = String(req.body.ticketType || 'GARLANDING');
  const paymentFlag = normalizePaymentFlag(req.body.paymentMethod ?? req.body.isCreditCard ?? req.body.creditCardNo);
  const referenceLabel = ticketType === 'PAGING BOARD' ? 'Serial No' : 'Flight No';
  if (!flightNo) return res.status(400).json({ message: `${referenceLabel} is required.` });
  if (!company) return res.status(400).json({ message: 'Company is required.' });
  const ticketPrices = await getTicketPrices(pool);
  if (!(ticketType in ticketPrices)) return res.status(400).json({ message: 'Select a valid ticket type.' });
  if (!Number.isInteger(qty) || qty < 1 || qty > 6) return res.status(400).json({ message: 'Quantity must be between 1 and 6.' });
  if (await isClosed(pool, businessDate, req.user?.sessionId)) return res.status(409).json({ message: 'Sales are closed for today.' });
  const ticketTypeId = ticketType === 'GARLANDING' ? 1 : 2;
  const targetTable = ticketTypeId === 1 ? 'dbo.TICKETING_G' : 'dbo.TICKETING_P';
  const subTableCols = ticketTypeId === 1 
    ? 'SERIALNO, F_NO, COMPANY, TICKET_TYPE_ID, QTY, CHARGE, USERID, SESSIONENDFLAG, DATETIME, SessionId, CREDIT'
    : 'SERIALNO, F_NO, COMPANY, TICKET_TYPE_ID, QTY, CHARGE, USERID, SESSIONENDFLAG, DATETIME, verified, SessionId, CREDIT';
  const subTableVals = ticketTypeId === 1
    ? '@NewSubSerialNo, @flightNo, @company, @ticketTypeId, @qty, @charge, @userId, @sessionEndFlag, @now, @sessionId, @creditFlag'
    : '@NewSubSerialNo, @flightNo, @company, @ticketTypeId, @qty, @charge, @userId, @sessionEndFlag, @now, 0, @sessionId, @creditFlag';

  const result = await pool.request()
    .input('flightNo', flightNo).input('company', company)
    .input('ticketTypeId', ticketTypeId).input('qty', qty).input('charge', sql.Decimal(18, 2), ticketPrices[ticketType] * qty)
    .input('userId', operatorId).input('sessionEndFlag', 'N')
    .input('sessionId', req.user?.sessionId ?? null).input('creditFlag', sql.Int, paymentFlag)
    .query(`
      DECLARE @NewSerialNo INT = ISNULL((SELECT MAX(SERIALNO) FROM dbo.TICKETING_C), 0) + 1;
      DECLARE @NewSubSerialNo INT = ISNULL((
        SELECT MAX(s) FROM (
          SELECT MAX(SERIALNO) AS s FROM ${targetTable}
          UNION ALL
          SELECT MAX(SERIALNO) AS s FROM dbo.ERRORTICKETING WHERE ${ticketTypeId === 1 ? 'TICKET_TYPE_ID = 1' : 'TICKET_TYPE_ID IN (2, 3)'}
        ) AS maxSerials
      ), 0) + 1;
      DECLARE @now DATETIME = GETDATE();

      INSERT INTO ${targetTable} (${subTableCols})
      VALUES (${subTableVals});

      INSERT INTO dbo.TICKETING_C (SERIALNO, F_NO, COMPANY, TICKET_TYPE_ID, QTY, CHARGE, USERID, SESSIONENDFLAG, DATETIME, SessionId, CREDIT, RECEIPT_NO)
      OUTPUT inserted.ID AS id, @NewSubSerialNo AS serialNo, CONVERT(char(10), inserted.DATETIME, 23) AS businessDate, inserted.F_NO AS flightNo,
        inserted.COMPANY AS company, inserted.TICKET_TYPE_ID AS ticketType, inserted.QTY AS qty,
        inserted.CHARGE AS amount, 'counter' AS source, inserted.DATETIME AS createdAt, inserted.SessionId AS sessionId
      VALUES (@NewSerialNo, @flightNo, @company, @ticketTypeId, @qty, @charge, @userId, @sessionEndFlag, @now, @sessionId, @creditFlag, @NewSubSerialNo);
    `);
  res.status(201).json({ sale: result.recordset[0], summary: await getDaySummary(businessDate, req.user?.sessionId, pool) });
}

export async function closeTodaySales(req, res) {
  const businessDate = getBusinessDate();
  const manualGarlandingCashQty = Number(req.body.manualGarlandingCashQty || 0);
  const manualGarlandingCreditQty = Number(req.body.manualGarlandingCreditQty || 0);
  const manualPagingBoardCashQty = Number(req.body.manualPagingBoardCashQty || 0);
  const manualPagingBoardCreditQty = Number(req.body.manualPagingBoardCreditQty || 0);
  const sessionStartedAt = new Date(req.body.sessionStartedAt);
  const sessionEndedAt = new Date(req.body.sessionEndedAt);
  const manualQuantities = [manualGarlandingCashQty, manualGarlandingCreditQty, manualPagingBoardCashQty, manualPagingBoardCreditQty];
  if (manualQuantities.some(qty => !Number.isInteger(qty) || qty < 0 || qty > 9999)) return res.status(400).json({ message: 'Manual ticket quantities must be whole numbers between 0 and 9999.' });
  if (Number.isNaN(sessionStartedAt.valueOf()) || Number.isNaN(sessionEndedAt.valueOf()) || sessionEndedAt < sessionStartedAt) return res.status(400).json({ message: 'Enter valid session dates. Session end must be after session start.' });
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  if (await isClosed(pool, businessDate, req.user?.sessionId)) return res.status(409).json({ message: 'Sales are already closed for today.' });
  const saleCount = await pool.request().input('businessDate', businessDate).query('SELECT COUNT(*) AS count FROM dbo.TICKETING_C WHERE CONVERT(char(10), DATETIME, 23) = @businessDate');
  if (!saleCount.recordset[0].count && !manualQuantities.some(Boolean)) return res.status(400).json({ message: 'Record a sale or enter a manual ticket quantity before closing.' });
  const transaction = new sql.Transaction(pool);
  const ticketPrices = await getTicketPrices(pool);
  await transaction.begin();
  try {
    // Store manual entries only in the session manual-sales table, not as
    // ticket records in TICKETING_C.
    if (manualQuantities.some(Boolean)) {
      const manualSalesByType = [
        {
          ticketType: 1,
          cashQty: manualGarlandingCashQty,
          creditQty: manualGarlandingCreditQty,
          cashAmount: manualGarlandingCashQty * ticketPrices.GARLANDING,
          creditAmount: manualGarlandingCreditQty * ticketPrices.GARLANDING,
        },
        {
          ticketType: 2,
          cashQty: manualPagingBoardCashQty,
          creditQty: manualPagingBoardCreditQty,
          cashAmount: manualPagingBoardCashQty * ticketPrices['PAGING BOARD'],
          creditAmount: manualPagingBoardCreditQty * ticketPrices['PAGING BOARD'],
        },
      ];

      for (const sale of manualSalesByType) {
        await new sql.Request(transaction)
          .input('sessionId', req.user?.sessionId ?? null)
          .input('ticketType', sql.Int, sale.ticketType)
          .input('manualCashQty', sql.Int, sale.cashQty)
          .input('manualCashAmount', sql.Decimal(18, 2), sale.cashAmount)
          .input('manualCreditQty', sql.Int, sale.creditQty)
          .input('manualCreditAmount', sql.Decimal(18, 2), sale.creditAmount)
          .input('userId', req.user?.epfNumber || 'SYSTEM')
          .input('createdAt', sessionEndedAt)
          .query(`
            IF EXISTS (
              SELECT 1 FROM dbo.SESSION_MANUAL_SALES
              WHERE (SessionId = @sessionId OR (SessionId IS NULL AND @sessionId IS NULL))
                AND TICKET_TYPE = @ticketType
            )
              UPDATE dbo.SESSION_MANUAL_SALES
              SET manualCashQty = @manualCashQty,
                  manualCashAmount = @manualCashAmount,
                  manualCreditQty = @manualCreditQty,
                  manualCreditAmount = @manualCreditAmount,
                  totalAmount = @manualCashAmount + @manualCreditAmount,
                  userId = @userId,
                  shiftId = @sessionId,
                  createdAt = @createdAt
              WHERE (SessionId = @sessionId OR (SessionId IS NULL AND @sessionId IS NULL))
                AND TICKET_TYPE = @ticketType;
            ELSE
              INSERT INTO dbo.SESSION_MANUAL_SALES
                (SessionId, manualCashQty, manualCashAmount, manualCreditQty,
                 manualCreditAmount, totalAmount, userId, shiftId, createdAt, TICKET_TYPE)
              VALUES
                (@sessionId, @manualCashQty, @manualCashAmount, @manualCreditQty,
                 @manualCreditAmount, @manualCashAmount + @manualCreditAmount, @userId, @sessionId, @createdAt, @ticketType);
          `);
      }
    }
    await new sql.Request(transaction).input('businessDate', businessDate).input('sessionStartedAt', sessionStartedAt).input('sessionEndedAt', sessionEndedAt)
      .input('sessionId', req.user?.sessionId ?? null)
      .query(`
        -- Garlanding session income (TICKET_TYPE = 1)
        DECLARE @minSerialG INT = ISNULL(
          (SELECT MIN(SERIALNO) FROM dbo.TICKETING_G WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE'),
          (SELECT MIN(SERIALNO) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID = 1)
        );
        DECLARE @maxSerialG INT = ISNULL(
          (SELECT MAX(SERIALNO) FROM dbo.TICKETING_G WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE'),
          (SELECT MAX(SERIALNO) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID = 1)
        );
        DECLARE @totalIncomeG DECIMAL(18,2) = ISNULL((SELECT SUM(CHARGE) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID = 1), 0);
        DECLARE @totalItemsG INT = ISNULL((SELECT SUM(QTY) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID = 1), 0);
        DECLARE @cashCountG INT = ISNULL((SELECT COUNT(*) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID = 1 AND ISNULL(CREDIT, 0) = 0), 0);
        DECLARE @creditCountG INT = ISNULL((SELECT COUNT(*) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID = 1 AND ISNULL(CREDIT, 0) = 1), 0);
        DECLARE @sessionIncomeCreditG DECIMAL(18,2) = ISNULL((SELECT SUM(CASE WHEN ISNULL(CREDIT, 0) = 1 THEN CHARGE ELSE 0 END) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID = 1), 0);

        IF EXISTS (SELECT 1 FROM dbo.SESSIONINCOME WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), SESSION_START_DATETIME, 23) = @businessDate)) AND TICKET_TYPE = 1)
          UPDATE dbo.SESSIONINCOME 
          SET SESSION_END_DATETIME = @sessionEndedAt,
              START_SERIAL_NO = @minSerialG,
              END_SERIAL_NO = @maxSerialG,
              SESSION_INCOME = @totalIncomeG,
              NUMBER_OF_ITEMS = @totalItemsG,
              NUMBER_OF_VISITORS = @totalItemsG,
              CASH_COUNT = @cashCountG,
              SESSION_INCOME_CREDIT = @sessionIncomeCreditG,
              CREDIT_COUNT = @creditCountG,
              SessionId = COALESCE(SessionId, @sessionId)
          WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), SESSION_START_DATETIME, 23) = @businessDate)) AND TICKET_TYPE = 1;
        ELSE
          INSERT INTO dbo.SESSIONINCOME (SESSION_START_DATETIME, SESSION_END_DATETIME, START_SERIAL_NO, END_SERIAL_NO, SESSION_INCOME, NUMBER_OF_ITEMS, NUMBER_OF_VISITORS, TICKET_TYPE, CASH_COUNT, SESSION_INCOME_CREDIT, CREDIT_COUNT, SessionId)
          VALUES (@sessionStartedAt, @sessionEndedAt, @minSerialG, @maxSerialG, @totalIncomeG, @totalItemsG, @totalItemsG, 1, @cashCountG, @sessionIncomeCreditG, @creditCountG, @sessionId);

        -- Ticket type 3 is retained here for sales created by older app versions.
        DECLARE @minSerialP INT = ISNULL(
          (SELECT MIN(SERIALNO) FROM dbo.TICKETING_P WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE'),
          (SELECT MIN(SERIALNO) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID IN (2, 3))
        );
        DECLARE @maxSerialP INT = ISNULL(
          (SELECT MAX(SERIALNO) FROM dbo.TICKETING_P WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE'),
          (SELECT MAX(SERIALNO) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID IN (2, 3))
        );
        DECLARE @totalIncomeP DECIMAL(18,2) = ISNULL((SELECT SUM(CHARGE) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID IN (2, 3)), 0);
        DECLARE @totalItemsP INT = ISNULL((SELECT SUM(QTY) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID IN (2, 3)), 0);
        DECLARE @cashCountP INT = ISNULL((SELECT COUNT(*) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID IN (2, 3) AND ISNULL(CREDIT, 0) = 0), 0);
        DECLARE @creditCountP INT = ISNULL((SELECT COUNT(*) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID IN (2, 3) AND ISNULL(CREDIT, 0) = 1), 0);
        DECLARE @sessionIncomeCreditP DECIMAL(18,2) = ISNULL((SELECT SUM(CASE WHEN ISNULL(CREDIT, 0) = 1 THEN CHARGE ELSE 0 END) FROM dbo.TICKETING_C WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), DATETIME, 23) = @businessDate)) AND ISNULL(F_NO, '') <> 'MANUAL SALE' AND TICKET_TYPE_ID IN (2, 3)), 0);

        UPDATE legacyIncome
        SET TICKET_TYPE = 2
        FROM dbo.SESSIONINCOME AS legacyIncome
        WHERE ((@sessionId IS NOT NULL AND legacyIncome.SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), legacyIncome.SESSION_START_DATETIME, 23) = @businessDate))
          AND legacyIncome.TICKET_TYPE = 3
          AND NOT EXISTS (
            SELECT 1 FROM dbo.SESSIONINCOME AS currentIncome
            WHERE currentIncome.SESSION_START_DATETIME = legacyIncome.SESSION_START_DATETIME
              AND (currentIncome.SessionId = legacyIncome.SessionId OR (currentIncome.SessionId IS NULL AND legacyIncome.SessionId IS NULL))
              AND currentIncome.TICKET_TYPE = 2
          );

        IF EXISTS (SELECT 1 FROM dbo.SESSIONINCOME WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), SESSION_START_DATETIME, 23) = @businessDate)) AND TICKET_TYPE = 2)
          UPDATE dbo.SESSIONINCOME 
          SET SESSION_END_DATETIME = @sessionEndedAt,
              START_SERIAL_NO = @minSerialP,
              END_SERIAL_NO = @maxSerialP,
              SESSION_INCOME = @totalIncomeP,
              NUMBER_OF_ITEMS = @totalItemsP,
              NUMBER_OF_VISITORS = @totalItemsP,
              CASH_COUNT = @cashCountP,
              SESSION_INCOME_CREDIT = @sessionIncomeCreditP,
              CREDIT_COUNT = @creditCountP,
              SessionId = COALESCE(SessionId, @sessionId)
          WHERE ((@sessionId IS NOT NULL AND SessionId = @sessionId) OR (@sessionId IS NULL AND CONVERT(char(10), SESSION_START_DATETIME, 23) = @businessDate)) AND TICKET_TYPE = 2;
        ELSE
          INSERT INTO dbo.SESSIONINCOME (SESSION_START_DATETIME, SESSION_END_DATETIME, START_SERIAL_NO, END_SERIAL_NO, SESSION_INCOME, NUMBER_OF_ITEMS, NUMBER_OF_VISITORS, TICKET_TYPE, CASH_COUNT, SESSION_INCOME_CREDIT, CREDIT_COUNT, SessionId)
          VALUES (@sessionStartedAt, @sessionEndedAt, @minSerialP, @maxSerialP, @totalIncomeP, @totalItemsP, @totalItemsP, 2, @cashCountP, @sessionIncomeCreditP, @creditCountP, @sessionId);

        UPDATE dbo.tblSESSION
        SET sessionStatus = 'CLOSED'
        WHERE sessionStatus = 'ACTIVE';

        ;WITH nextSession AS (
          SELECT TOP 1 sessionId, sessionStatus, finalizedDateTime
          FROM dbo.tblSESSION
          WHERE sessionStatus IS NULL
            AND sessionEndTime > GETDATE()
          ORDER BY sessionStartTime, sessionId
        )
        UPDATE nextSession
        SET sessionStatus = 'ACTIVE', finalizedDateTime = GETDATE();

      `);
    await transaction.commit();
  } catch (error) { await transaction.rollback(); throw error; }

  // Sync session closing sales data to dbAsslAppToIFS (Garlanding appId: 7, Paging Board appId: 10)
  try {
    let operatorName = '';
    try {
      const userRes = await pool.request().input('epf', req.user?.epfNumber).query(
        'SELECT TOP 1 Name FROM dbo.USERS WHERE EmployeeNo = @epf OR UserID = @epf'
      );
      operatorName = userRes.recordset[0]?.Name || '';
    } catch {}

    const incRes = await pool.request().input('sessionId', req.user?.sessionId).query(`
      SELECT TICKET_TYPE, START_SERIAL_NO, END_SERIAL_NO, CASH_COUNT, CREDIT_COUNT
      FROM dbo.SESSIONINCOME
      WHERE SessionId = @sessionId
    `);
    const gInc = incRes.recordset.find(r => r.TICKET_TYPE === 1) || {};
    const pInc = incRes.recordset.find(r => r.TICKET_TYPE === 2) || {};

    await syncSessionToIfs({
      sessionId: req.user?.sessionId,
      operatorId: req.user?.epfNumber,
      operatorName,
      sessionStartedAt,
      sessionEndedAt,
      garlanding: {
        unitPrice: ticketPrices.GARLANDING,
        cashQty: (gInc.CASH_COUNT || 0) + manualGarlandingCashQty,
        creditQty: (gInc.CREDIT_COUNT || 0) + manualGarlandingCreditQty,
        minSerial: gInc.START_SERIAL_NO,
        maxSerial: gInc.END_SERIAL_NO,
      },
      pagingBoard: {
        unitPrice: ticketPrices['PAGING BOARD'],
        cashQty: (pInc.CASH_COUNT || 0) + manualPagingBoardCashQty,
        creditQty: (pInc.CREDIT_COUNT || 0) + manualPagingBoardCreditQty,
        minSerial: pInc.START_SERIAL_NO,
        maxSerial: pInc.END_SERIAL_NO,
      },
    });
  } catch (ifsError) {
    console.error('IFS sync error on session close:', ifsError.message);
  }

  res.json(await getDaySummary(businessDate, req.user?.sessionId, pool));
}

export async function reopenTodaySales(req, res) {
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const businessDate = getBusinessDate();
  const sessionId = req.user?.sessionId ?? null;
  const whereCondition = sessionId
    ? 'SessionId = @sessionId'
    : 'CONVERT(char(10), SESSION_START_DATETIME, 23) = @businessDate';
  const result = await pool.request()
    .input('businessDate', businessDate)
    .input('sessionId', sessionId)
    .query(`UPDATE dbo.SESSIONINCOME SET SESSION_END_DATETIME = NULL WHERE ${whereCondition} AND SESSION_END_DATETIME IS NOT NULL`);
  if (!result.rowsAffected[0]) return res.status(400).json({ message: 'Sales are already open for today.' });
  res.json(await getDaySummary(businessDate, req.user?.sessionId, pool));
}

export async function getSalesHistory(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
  const date = req.query.date;
  if (date !== undefined && !isValidDateOnly(date)) {
    return res.status(400).json({ message: 'Select a valid history date.' });
  }
  const airport = req.user?.airport;
  if (!airport) return res.status(400).json({ message: 'Your session has no airport selected. Please sign in again.' });
  const isPagingBoard = req.query.ticketType === 'PAGING BOARD';
  if (!isPagingBoard && req.query.ticketType !== 'GARLANDING') {
    return res.status(400).json({ message: 'Select a valid ticket type.' });
  }
  const historyTable = isPagingBoard ? 'dbo.TICKETING_P' : 'dbo.TICKETING_G';
  const typeFilter = isPagingBoard ? 'TICKET_TYPE_ID IN (2, 3)' : 'TICKET_TYPE_ID = 1';
  const dateFilter = (date
    ? ' AND DATETIME >= CONVERT(date, @date) AND DATETIME < DATEADD(day, 1, CONVERT(date, @date))'
    : '') + ' AND SERIALNO NOT IN (SELECT SERIALNO FROM dbo.ERRORTICKETING WHERE SERIALNO IS NOT NULL)';
  const offset = (page - 1) * limit;

  const pool = getPoolForAirport(airport);
  const countRequest = pool.request();
  if (date) countRequest.input('date', date);
  const countResult = await countRequest.query(
    `SELECT COUNT(*) AS total FROM ${historyTable} WHERE ${typeFilter}${dateFilter}`
  );
  
  const total = countResult.recordset[0].total;

  const historyRequest = pool.request().input('offset', offset).input('limit', limit);
  if (date) historyRequest.input('date', date);
  const result = await historyRequest.query(`
      SELECT ID AS id, SERIALNO AS serialNo, F_NO AS flightNo,
             COMPANY AS company, QTY AS qty, CHARGE AS amount, DATETIME AS createdAt
      FROM ${historyTable}
      WHERE ${typeFilter}${dateFilter}
      ORDER BY DATETIME DESC, ID DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

  const tickets = result.recordset.map(row => ({
    id: row.id,
    serialNo: row.serialNo,
    flightNo: row.flightNo,
    company: row.company,
    ticketType: isPagingBoard ? 'PAGING BOARD' : 'GARLANDING',
    qty: row.qty,
    amount: Number(row.amount),
    createdAt: row.createdAt
  }));

  res.json({
    tickets,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

export async function getSalesReport(req, res) {
  const shiftId = req.query.shiftId ? Number(req.query.shiftId) : null;
  const date = String(req.query.date || '').trim();
  const requestedTicketTypes = req.query.ticketTypes;
  const validTicketTypes = ['GARLANDING', 'PAGING_BOARD'];
  let ticketTypes = validTicketTypes;
  if (requestedTicketTypes !== undefined) {
    if (typeof requestedTicketTypes !== 'string') {
      return res.status(400).json({ message: 'Select valid ticket types.' });
    }
    ticketTypes = requestedTicketTypes.split(',');
    if (!ticketTypes.length || ticketTypes.some(type => !validTicketTypes.includes(type))) {
      return res.status(400).json({ message: 'Select valid ticket types.' });
    }
    ticketTypes = [...new Set(ticketTypes)];
  }
  if (!ticketTypes.length) return res.status(400).json({ message: 'Select at least one ticket type.' });
  if (shiftId && (!Number.isInteger(shiftId) || shiftId < 1)) return res.status(400).json({ message: 'Select a valid shift.' });
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Select a valid report date.' });

  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  let shift = null;
  if (shiftId) {
    const shiftResult = await pool.request().input('shiftId', shiftId).query(`
      SELECT sessionId AS id, sessionStartTime AS startAt, sessionEndTime AS endAt, shiftType AS shiftType
      FROM dbo.tblSESSION WHERE sessionId = @shiftId`);
    shift = shiftResult.recordset[0];
    if (!shift) return res.status(404).json({ message: 'Shift session not found.' });
  }
  const serializedShift = shift ? {
    id: shift.id,
    startAt: toBusinessDateTime(shift.startAt),
    endAt: toBusinessDateTime(shift.endAt),
    shiftType: shift.shiftType
  } : null;

  const request = pool.request();
  let where = '';
  if (shift) {
    request.input('startAt', shift.startAt).input('endAt', shift.endAt);
    where = 'WHERE DATETIME >= @startAt AND DATETIME <= @endAt';
  } else if (date) {
    request.input('businessDate', date);
    where = 'WHERE CONVERT(char(10), DATETIME, 23) = @businessDate';
  } else {
    return res.status(400).json({ message: 'Select a shift or report date.' });
  }
  const allTicketTypes = ticketTypes.length === validTicketTypes.length;
  const systemTypeFilter = allTicketTypes
    ? ''
    : ticketTypes.includes('GARLANDING')
      ? ' AND TICKET_TYPE_ID = 1'
      : ' AND TICKET_TYPE_ID IN (2, 3)';
  const manualTypeFilter = allTicketTypes
    ? ''
    : ticketTypes.includes('GARLANDING')
      ? ' AND TICKET_TYPE = 1'
      : ' AND TICKET_TYPE = 2';
  const voidTypeFilter = allTicketTypes
    ? ''
    : ticketTypes.includes('GARLANDING')
      ? ' AND TICKET_TYPE_ID = 1'
      : ' AND TICKET_TYPE_ID IN (2, 3)';
  const ticketWhere = `${where}${systemTypeFilter} AND SERIALNO NOT IN (SELECT SERIALNO FROM dbo.ERRORTICKETING WHERE SERIALNO IS NOT NULL)`;

  const result = await request.query(`
    SELECT CASE WHEN TICKET_TYPE_ID IN (2, 3) THEN 2 ELSE TICKET_TYPE_ID END AS ticketTypeId, COUNT(*) AS transactions, ISNULL(SUM(QTY), 0) AS items, ISNULL(SUM(CHARGE), 0) AS amount
    FROM dbo.TICKETING_C ${ticketWhere}
    GROUP BY CASE WHEN TICKET_TYPE_ID IN (2, 3) THEN 2 ELSE TICKET_TYPE_ID END;
    SELECT ID AS id, SERIALNO AS serialNo, F_NO AS flightNo, COMPANY AS company, TICKET_TYPE_ID AS ticketTypeId,
           QTY AS qty, CHARGE AS amount, DATETIME AS createdAt, SessionId AS sessionId,
           ISNULL(CREDIT, 0) AS credit, USERID AS userId
    FROM dbo.TICKETING_C ${ticketWhere}
    ORDER BY DATETIME ASC, ID ASC;
  `);
  const summaries = result.recordsets[0];
  const tickets = result.recordsets[1].map(row => ({
    ...row,
    amount: Number(row.amount),
    credit: Number(row.credit),
    ticketType: row.ticketTypeId === 2 || row.ticketTypeId === 3 ? 'Paging Board' : 'Garlanding'
  }));

  const manualRequest = pool.request();
  const voidRequest = pool.request();
  let manualWhere = '';
  let voidWhere = '';
  if (shift) {
    manualRequest.input('shiftId', shift.id);
    voidRequest.input('startAt', shift.startAt).input('endAt', shift.endAt);
    manualWhere = 'WHERE SessionId = @shiftId';
    voidWhere = 'WHERE DATETIME >= @startAt AND DATETIME <= @endAt';
  } else {
    manualRequest.input('businessDate', date);
    voidRequest.input('businessDate', date);
    manualWhere = 'WHERE CONVERT(char(10), createdAt, 23) = @businessDate';
    voidWhere = 'WHERE CONVERT(char(10), DATETIME, 23) = @businessDate';
  }
  manualWhere += manualTypeFilter;
  voidWhere += voidTypeFilter;

  const [manualResult, voidResult] = await Promise.all([
    manualRequest.query(`
      SELECT TICKET_TYPE AS ticketType, userId,
             ISNULL(SUM(manualCashQty), 0) AS cashQty,
             ISNULL(SUM(manualCashAmount), 0) AS cashAmount,
             ISNULL(SUM(manualCreditQty), 0) AS creditQty,
             ISNULL(SUM(manualCreditAmount), 0) AS creditAmount
      FROM dbo.SESSION_MANUAL_SALES ${manualWhere}
      GROUP BY TICKET_TYPE, userId
    `),
    voidRequest.query(`SELECT COUNT(*) AS count FROM dbo.ERRORTICKETING ${voidWhere}`)
  ]);
  const manualSales = manualResult.recordset.map(row => ({
    ticketType: Number(row.ticketType),
    cashQty: Number(row.cashQty),
    cashAmount: Number(row.cashAmount),
    creditQty: Number(row.creditQty),
    creditAmount: Number(row.creditAmount),
    userId: row.userId
  }));
  const total = summaries.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const items = summaries.reduce((sum, row) => sum + Number(row.items || 0), 0);
  const serialNumbers = tickets.map(ticket => Number(ticket.serialNo)).filter(Number.isFinite);
  const users = [...new Set([
    ...tickets.map(ticket => ticket.userId),
    ...manualSales.map(sale => sale.userId)
  ].map(userId => String(userId || '').trim()).filter(Boolean))];
  res.json({
    airport: req.user?.airport || 'BIA',
    ticketTypes,
    shift: serializedShift,
    date: date || (shift ? new Date(shift.startAt).toISOString().slice(0, 10) : null),
    totals: { amount: total, items, transactions: tickets.length },
    breakdown: summaries.map(row => ({ ticketType: row.ticketTypeId === 2 || row.ticketTypeId === 3 ? 'Paging Board' : 'Garlanding', transactions: Number(row.transactions), items: Number(row.items), amount: Number(row.amount) })),
    startSerialNo: serialNumbers.length ? Math.min(...serialNumbers) : null,
    endSerialNo: serialNumbers.length ? Math.max(...serialNumbers) : null,
    cancelledTickets: Number(voidResult.recordset[0]?.count || 0),
    users,
    manualSales,
    tickets
  });
}

export async function voidTicket(req, res) {
  const operatorId = String(req.user?.epfNumber || '').trim();
  if (!operatorId) return res.status(401).json({ message: 'A verified operator identity is required to record an error ticket.' });
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  await ensurePaymentColumns(pool);
  const ticketId = Number(req.body.ticketId);
  const printFailure = req.body.printFailure === true;
  if (!Number.isInteger(ticketId) || ticketId < 1) {
    return res.status(400).json({
      message: printFailure ? 'Select a valid ticket to record a print error.' : 'Select a valid ticket to void.'
    });
  }

  const ticketRes = await pool.request().input('ticketId', ticketId).query(`
    SELECT ID AS id, SERIALNO AS serialNo, RECEIPT_NO AS receiptNo, TICKET_TYPE_ID AS ticketTypeId, USERID AS userId,
           SESSIONENDFLAG AS sessionEndFlag, DATETIME AS createdAt, CHARGE AS amount, QTY AS qty,
           F_NO AS flightNo, COMPANY AS company, SessionId AS sessionId, ISNULL(CREDIT, 0) AS credit
    FROM dbo.TICKETING_C
    WHERE ID = @ticketId
  `);
  const ticket = ticketRes.recordset[0];
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }
  if (printFailure && String(ticket.userId || '').trim() !== operatorId) {
    return res.status(403).json({ message: 'Only the authenticated operator who recorded this ticket can report its print failure.' });
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const subTable = ticket.ticketTypeId === 1 ? 'dbo.TICKETING_G' : 'dbo.TICKETING_P';
    const subRecord = await new sql.Request(transaction)
      .input('createdAt', ticket.createdAt)
      .input('userId', ticket.userId || operatorId)
      .input('sessionId', ticket.sessionId ?? null)
      .query(`
        SELECT TOP 1 SERIALNO, ID FROM ${subTable}
        WHERE DATETIME = @createdAt AND USERID = @userId 
          AND (SessionId = @sessionId OR (SessionId IS NULL AND @sessionId IS NULL))
      `);
    const actualSubSerial = subRecord.recordset[0]?.SERIALNO ?? ticket.receiptNo ?? ticket.serialNo;

    const reqTx = new sql.Request(transaction);
    reqTx.input('serialNo', actualSubSerial)
      .input('ticketTypeId', ticket.ticketTypeId)
      .input('userId', ticket.userId || operatorId)
      .input('sessionEndFlag', ticket.sessionEndFlag || 'N')
      .input('createdAt', ticket.createdAt)
      .input('charge', sql.Decimal(18, 2), ticket.amount)
      .input('qty', ticket.qty)
      .input('flightNo', ticket.flightNo)
      .input('company', ticket.company)
      .input('sessionId', ticket.sessionId ?? null)
      .input('credit', ticket.credit);

    await reqTx.query(`
      IF COL_LENGTH('dbo.ERRORTICKETING', 'RECEIPT_NO') IS NOT NULL
      BEGIN
        INSERT INTO dbo.ERRORTICKETING (ID, SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME, CHARGE, QTY, F_NO, COMPANY, RECEIPT_NO, SessionId, CREDIT)
        VALUES (@serialNo, @serialNo, @ticketTypeId, @userId, @sessionEndFlag, @createdAt, @charge, @qty, @flightNo, @company, @serialNo, @sessionId, @credit);
      END
      ELSE
      BEGIN
        INSERT INTO dbo.ERRORTICKETING (ID, SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME, CHARGE, QTY, F_NO, COMPANY, SessionId, CREDIT)
        VALUES (@serialNo, @serialNo, @ticketTypeId, @userId, @sessionEndFlag, @createdAt, @charge, @qty, @flightNo, @company, @sessionId, @credit);
      END
    `);

    await new sql.Request(transaction).input('ticketId', ticketId).query('DELETE FROM dbo.TICKETING_C WHERE ID = @ticketId');

    await new sql.Request(transaction)
      .input('serialNo', actualSubSerial)
      .input('createdAt', ticket.createdAt)
      .input('userId', ticket.userId || operatorId)
      .input('sessionId', ticket.sessionId ?? null)
      .query(`
        DELETE FROM ${subTable} 
        WHERE SERIALNO = @serialNo
           OR (DATETIME = @createdAt AND USERID = @userId AND (SessionId = @sessionId OR (SessionId IS NULL AND @sessionId IS NULL)))
      `);

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  const businessDate = getBusinessDate();
  res.json({
    message: printFailure
      ? `Print error for ticket #${ticket.serialNo} recorded in Error Ticketing.`
      : `Ticket #${ticket.serialNo} voided and recorded in error ticketing.`,
    summary: await getDaySummary(businessDate, req.user?.sessionId, pool)
  });
}

export async function getErrorTickets(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
  const date = req.query.date;
  if (date !== undefined && !isValidDateOnly(date)) {
    return res.status(400).json({ message: 'Select a valid error-ticket date.' });
  }
  const ticketType = String(req.query.ticketType || '').trim().toUpperCase();
  if (!['ALL', 'GARLANDING', 'PAGING BOARD'].includes(ticketType)) {
    return res.status(400).json({ message: 'A valid ticketType is required.' });
  }
  const offset = (page - 1) * limit;
  const filters = [];
  if (ticketType === 'GARLANDING') filters.push('TICKET_TYPE_ID = 1');
  if (ticketType === 'PAGING BOARD') filters.push('TICKET_TYPE_ID IN (2, 3)');
  if (date) filters.push('DATETIME >= CONVERT(date, @date) AND DATETIME < DATEADD(day, 1, CONVERT(date, @date))');
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  let countResult;
  let result;
  try {
    const countRequest = pool.request();
    if (date) countRequest.input('date', date);
    countResult = await countRequest.query(
      `SELECT COUNT(*) AS total FROM dbo.ERRORTICKETING ${whereClause}`
    );

    const ticketRequest = pool.request().input('offset', offset).input('limit', limit);
    if (date) ticketRequest.input('date', date);
    result = await ticketRequest.query(`
      SELECT ID AS id, SERIALNO AS serialNo, TICKET_TYPE_ID AS ticketTypeId, USERID AS userId,
             DATETIME AS createdAt, CHARGE AS amount, QTY AS qty, F_NO AS flightNo,
             COMPANY AS company, SessionId AS sessionId, ISNULL(CREDIT, 0) AS credit
      FROM dbo.ERRORTICKETING
      ${whereClause}
      ORDER BY DATETIME DESC, ID DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  } catch (error) {
    if (error.number === 208) {
      return res.status(503).json({
        message: `The ${req.user?.airport || 'selected'} airport is missing dbo.ERRORTICKETING.`
      });
    }
    throw error;
  }
  const total = countResult.recordset[0].total;

  const tickets = result.recordset.map(row => ({
    id: row.id,
    serialNo: row.serialNo,
    ticketType: row.ticketTypeId === 2 || row.ticketTypeId === 3 ? 'PAGING BOARD' : 'GARLANDING',
    flightNo: row.flightNo,
    company: row.company,
    qty: row.qty,
    amount: Number(row.amount || 0),
    credit: row.credit,
    createdAt: row.createdAt,
    voidedAt: row.createdAt
  }));

  res.json({
    tickets,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}
