import connectDatabase, { getPool, sql } from '../config/db.js';

await connectDatabase();
const pool = getPool();
const transaction = new sql.Transaction(pool);

await transaction.begin();
try {
  const result = await new sql.Request(transaction).query(`
    ;WITH manualSales AS (
      SELECT
        SessionId,
        SUM(QTY) AS manualCashQty,
        SUM(CHARGE) AS manualCashAmount,
        MAX(USERID) AS userId,
        MAX(DATETIME) AS createdAt
      FROM dbo.TICKETING_C
      WHERE F_NO = 'MANUAL SALE'
        AND SessionId IS NOT NULL
      GROUP BY SessionId
    )
    UPDATE destination
    SET manualCashQty = source.manualCashQty,
        manualCashAmount = source.manualCashAmount,
        manualCreditQty = 0,
        manualCreditAmount = 0,
        totalAmount = source.manualCashAmount,
        userId = source.userId,
        shiftId = source.SessionId,
        createdAt = source.createdAt
    FROM dbo.SESSION_MANUAL_SALES AS destination
    INNER JOIN manualSales AS source ON source.SessionId = destination.SessionId;

    ;WITH manualSales AS (
      SELECT
        SessionId,
        SUM(QTY) AS manualCashQty,
        SUM(CHARGE) AS manualCashAmount,
        MAX(USERID) AS userId,
        MAX(DATETIME) AS createdAt
      FROM dbo.TICKETING_C
      WHERE F_NO = 'MANUAL SALE'
        AND SessionId IS NOT NULL
      GROUP BY SessionId
    )
    INSERT INTO dbo.SESSION_MANUAL_SALES
      (SessionId, manualCashQty, manualCashAmount, manualCreditQty,
       manualCreditAmount, totalAmount, userId, shiftId, createdAt)
    SELECT
      source.SessionId, source.manualCashQty, source.manualCashAmount, 0,
      0, source.manualCashAmount, source.userId, source.SessionId, source.createdAt
    FROM manualSales AS source
    WHERE NOT EXISTS (
      SELECT 1
      FROM dbo.SESSION_MANUAL_SALES AS destination
      WHERE destination.SessionId = source.SessionId
    );

    SELECT *
    FROM dbo.SESSION_MANUAL_SALES
    ORDER BY createdAt DESC, ID DESC;
  `);
  await transaction.commit();
  console.table(result.recordset);
} catch (error) {
  await transaction.rollback();
  throw error;
} finally {
  await pool.close();
}
