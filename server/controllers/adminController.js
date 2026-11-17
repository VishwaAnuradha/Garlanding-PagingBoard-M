// Import database connection and SQL data types
import { getPool, sql } from '../config/db.js';

// Import business date utility
import { getBusinessDate } from '../utils/businessDate.js';

// Default system settings
const defaultSettings = {
  systemName: 'Garlanding Ticket Counter',
  counterName: 'Arrival Counter',
  printerName: '',
  ticketPrices: { GARLANDING: 500, 'PAGING BOARD': 300 },
};

// Define the required database columns and their data types
const SETTINGS_COLUMNS = [
  ['SystemName', "NVARCHAR(200) NOT NULL CONSTRAINT DF_tblSettings_SystemName DEFAULT N'Garlanding Ticket Counter'"],
  ['CounterName', "NVARCHAR(200) NOT NULL CONSTRAINT DF_tblSettings_CounterName DEFAULT N'Arrival Counter'"],
  ['PrinterName', 'NVARCHAR(200) NULL'],
  ['GarlandingPrice', 'DECIMAL(18, 2) NOT NULL CONSTRAINT DF_tblSettings_GarlandingPrice DEFAULT 500'],
  ['PagingBoardPrice', 'DECIMAL(18, 2) NOT NULL CONSTRAINT DF_tblSettings_PagingBoardPrice DEFAULT 300'],
  ['UpdatedAt', 'DATETIME2 NULL'],
];

// Check and update the settings table structure
export async function ensureSettingsSchema() {
  const pool = getPool();

  // Create the settings table if it does not exist
  await pool.request().query(`
    IF OBJECT_ID('dbo.tblSettings', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.tblSettings (
        Id INT NOT NULL CONSTRAINT PK_tblSettings PRIMARY KEY,
        SystemName NVARCHAR(200) NOT NULL,
        CounterName NVARCHAR(200) NOT NULL,
        PrinterName NVARCHAR(200) NULL,
        GarlandingPrice DECIMAL(18, 2) NOT NULL,
        PagingBoardPrice DECIMAL(18, 2) NOT NULL,
        UpdatedAt DATETIME2 NULL
      );
    END;
  `);

  // Get the existing column names
  const check = await pool.request().query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tblSettings'"
  );

  const existing = new Set(check.recordset.map(row => row.COLUMN_NAME));

  // Add missing columns to the settings table
  for (const [name, definition] of SETTINGS_COLUMNS) {
    if (!existing.has(name)) {
      await pool.request().query(
        `ALTER TABLE dbo.tblSettings ADD ${name} ${definition};`
      );
    }
  }

  // Insert default settings if no settings record exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM dbo.tblSettings WHERE Id = 1)
    BEGIN
      IF COLUMNPROPERTY(OBJECT_ID('dbo.tblSettings'), 'ID', 'IsIdentity') = 1
        SET IDENTITY_INSERT dbo.tblSettings ON;

      INSERT INTO dbo.tblSettings
      (Id, SystemName, CounterName, PrinterName, GarlandingPrice, PagingBoardPrice, UpdatedAt)
      VALUES (1, N'Garlanding Ticket Counter', N'Arrival Counter', N'', 500, 300, SYSUTCDATETIME());

      IF COLUMNPROPERTY(OBJECT_ID('dbo.tblSettings'), 'ID', 'IsIdentity') = 1
        SET IDENTITY_INSERT dbo.tblSettings OFF;
    END;

    // Update ticket types and session income records
  `);
}

// Get system settings from the database
export async function getSettings(_req, res) {
  let row = null;

  try {
    // Ensure the settings table has the required columns
    await ensureSettingsSchema();

    // Retrieve the saved settings
    const result = await getPool().request().query(
      'SELECT TOP 1 SystemName, CounterName, PrinterName, GarlandingPrice, PagingBoardPrice FROM dbo.tblSettings WHERE Id = 1'
    );

    row = result.recordset[0];

  } catch (error) {
    // Return default settings if the database table cannot be accessed
    if (error.number === 207 || error.number === 208)
      return res.json(defaultSettings);

    throw error;
  }

  // Send the settings as a JSON response
  res.json(row ? {
    systemName: row.SystemName,
    counterName: row.CounterName,
    printerName: row.PrinterName,
    ticketPrices: {
      GARLANDING: Number(row.GarlandingPrice),
      'PAGING BOARD': Number(row.PagingBoardPrice)
    },
  } : defaultSettings);
}

// Update system settings
export async function updateSettings(req, res) {

  // Get values from the frontend request
  const systemName = String(req.body.systemName || '').trim();
  const counterName = String(req.body.counterName || '').trim();
  const printerName = String(req.body.printerName || '').trim();

  // Get ticket prices
  const garlandingPrice = Number(req.body.ticketPrices?.GARLANDING);
  const pagingBoardPrice = Number(req.body.ticketPrices?.['PAGING BOARD']);

  // Validate required fields
  if (!systemName || !counterName)
    return res.status(400).json({
      message: 'System name and counter name are required.'
    });

  // Validate ticket prices
  if (![garlandingPrice, pagingBoardPrice].every(price =>
    Number.isFinite(price) && price >= 0 && price <= 1000000
  ))
    return res.status(400).json({
      message: 'Enter valid ticket prices.'
    });

  // Ensure the database table is ready
  await ensureSettingsSchema();

  // Save or update settings in the database
  await getPool().request()
    .input('systemName', systemName)
    .input('counterName', counterName)
    .input('printerName', printerName)
    .input('garlandingPrice', sql.Decimal(18, 2), garlandingPrice)
    .input('pagingBoardPrice', sql.Decimal(18, 2), pagingBoardPrice)
    .query(`
      MERGE dbo.tblSettings AS target
      USING (SELECT 1 AS Id) AS source
      ON target.Id = source.Id

      WHEN MATCHED THEN
        UPDATE SET
          SystemName = @systemName,
          CounterName = @counterName,
          PrinterName = @printerName,
          GarlandingPrice = @garlandingPrice,
          PagingBoardPrice = @pagingBoardPrice,
          UpdatedAt = SYSUTCDATETIME()

      WHEN NOT MATCHED THEN
        INSERT (Id, SystemName, CounterName, PrinterName, GarlandingPrice, PagingBoardPrice)
        VALUES (1, @systemName, @counterName, @printerName, @garlandingPrice, @pagingBoardPrice);
    `);

  // Return the updated settings
  res.json({
    systemName,
    counterName,
    printerName,
    ticketPrices: {
      GARLANDING: garlandingPrice,
      'PAGING BOARD': pagingBoardPrice
    }
  });
}

// Get dashboard information
export async function getDashboard(_req, res) {

  // Get the current business date
  const businessDate = getBusinessDate();

  // Calculate the beginning of the current month
  const monthStart = `${businessDate.slice(0, 7)}-01`;

  const pool = getPool();

  // Check whether the CREDIT column exists
  const creditColumn = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'TICKETING_C'
    AND COLUMN_NAME = 'CREDIT'
  `);

  const hasCreditColumn = creditColumn.recordset.length > 0;

  // Calculate cash and credit payments if the column exists
  const paymentCase = hasCreditColumn ? `
    COALESCE(SUM(CASE WHEN CREDIT = 0 THEN CHARGE ELSE 0 END), 0) AS cashPayments,
    COALESCE(SUM(CASE WHEN CREDIT = 1 THEN CHARGE ELSE 0 END), 0) AS creditPayments
  ` : '0 AS cashPayments, 0 AS creditPayments';

  // Exclude error ticket records from dashboard calculations
  const notError = ` AND NOT EXISTS (
    SELECT 1 FROM dbo.ERRORTICKETING e
    WHERE (
      (dbo.TICKETING_C.RECEIPT_NO IS NOT NULL AND
       (e.RECEIPT_NO = dbo.TICKETING_C.RECEIPT_NO OR e.SERIALNO = dbo.TICKETING_C.RECEIPT_NO))
      OR
      (dbo.TICKETING_C.RECEIPT_NO IS NULL AND
       e.SERIALNO = dbo.TICKETING_C.SERIALNO)
    )
    AND (e.TICKET_TYPE_ID = dbo.TICKETING_C.TICKET_TYPE_ID
      OR (dbo.TICKETING_C.TICKET_TYPE_ID IN (2, 3)
      AND e.TICKET_TYPE_ID IN (2, 3)))
  )`;

  // Execute dashboard queries simultaneously
  const [today, week, month, recent] = await Promise.all([

    // Get today's sales and ticket quantities
    pool.request().input('businessDate', businessDate).query(`
      SELECT
        COUNT(*) AS transactions,
        COALESCE(SUM(QTY), 0) AS items,
        COALESCE(SUM(CHARGE), 0) AS revenue,
        COALESCE(SUM(CASE WHEN TICKET_TYPE_ID = 1 THEN QTY ELSE 0 END), 0) AS garlandingQty,
        COALESCE(SUM(CASE WHEN TICKET_TYPE_ID IN (2, 3) THEN QTY ELSE 0 END), 0) AS pagingBoardQty,
        ${paymentCase}
      FROM dbo.TICKETING_C
      WHERE DATETIME >= CONVERT(date, @businessDate)
      AND DATETIME < DATEADD(day, 1, CONVERT(date, @businessDate))
      ${notError}
    `),

    // Get revenue for the last seven days
    pool.request().input('businessDate', businessDate).query(`
      SELECT COALESCE(SUM(CHARGE), 0) AS revenue
      FROM dbo.TICKETING_C
      WHERE DATETIME >= DATEADD(day, -6, CONVERT(date, @businessDate))
      AND DATETIME < DATEADD(day, 1, CONVERT(date, @businessDate))
      ${notError}
    `),

    // Get revenue from the beginning of the month until today
    pool.request()
      .input('monthStart', monthStart)
      .input('businessDate', businessDate)
      .query(`
        SELECT COALESCE(SUM(CHARGE), 0) AS revenue
        FROM dbo.TICKETING_C
        WHERE DATETIME >= CONVERT(date, @monthStart)
        AND DATETIME < DATEADD(day, 1, CONVERT(date, @businessDate))
        ${notError}
      `),

    // Get the latest six sales records
    pool.request().input('businessDate', businessDate).query(`
      SELECT TOP 6
        ID AS id,
        F_NO AS flightNo,
        COMPANY AS company,
        TICKET_TYPE_ID AS ticketType,
        QTY AS qty,
        CHARGE AS amount,
        DATETIME AS createdAt
      FROM dbo.TICKETING_C
      WHERE DATETIME >= CONVERT(date, @businessDate)
      AND DATETIME < DATEADD(day, 1, CONVERT(date, @businessDate))
      ${notError}
      ORDER BY DATETIME DESC
    `),
  ]);

  // Convert dashboard totals into numbers
  const totals = today.recordset[0];

  // Send dashboard data to the frontend
  res.json({
    businessDate,
    today: Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, Number(value)])
    ),
    weekRevenue: Number(week.recordset[0].revenue),
    monthRevenue: Number(month.recordset[0].revenue),
    sessionCashPayments: Number(totals.cashPayments || 0),
    sessionCreditPayments: Number(totals.creditPayments || 0),
    recentSales: recent.recordset
  });
}

// Get session income details
export async function getSessionIncome(_req, res) {
  const pool = getPool();

  // Retrieve all session income records
  const result = await pool.request().query(`
    SELECT
      s.ID AS id,
      s.SessionId AS sessionId,
      s.TICKET_TYPE AS ticketType,
      s.SESSION_START_DATETIME AS sessionStartDatetime,
      s.SESSION_END_DATETIME AS sessionEndDatetime,
      s.START_SERIAL_NO AS startSerialNo,
      s.END_SERIAL_NO AS endSerialNo,
      s.NUMBER_OF_ITEMS AS numberOfItems,
      s.NUMBER_OF_VISITORS AS numberOfVisitors,
      s.SESSION_INCOME AS sessionIncome,
      s.CASH_COUNT AS cashCount,
      s.CREDIT_COUNT AS creditCount,
      s.SESSION_INCOME_CREDIT AS sessionIncomeCredit
    FROM dbo.SESSIONINCOME s
    ORDER BY s.SESSION_START_DATETIME DESC, s.ID DESC
  `);

  // Format database records for the frontend
  const rows = result.recordset.map(row => ({
    id: row.id,
    sessionId: row.sessionId,

    // Convert ticket type ID into a readable name
    ticketType: row.ticketType === 1 ? 'GARLANDING' : 'PAGING BOARD',

    ticketTypeId: row.ticketType,
    sessionStartDatetime: row.sessionStartDatetime,
    sessionEndDatetime: row.sessionEndDatetime,
    startSerialNo: row.startSerialNo,
    endSerialNo: row.endSerialNo,
    numberOfItems: Number(row.numberOfItems || 0),
    numberOfVisitors: Number(row.numberOfVisitors || 0),
    sessionIncome: Number(row.sessionIncome || 0),
    cashCount: Number(row.cashCount || 0),
    creditCount: Number(row.creditCount || 0),
    sessionIncomeCredit: Number(row.sessionIncomeCredit || 0),
  }));

  // Return session income records
  res.json({ sessions: rows });
}