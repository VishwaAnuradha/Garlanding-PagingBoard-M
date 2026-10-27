import { getPool } from '../config/db.js';

export async function getDaySummary(businessDate, sessionId, pool) {
  if (!pool) pool = getPool();

  let finalizedDateTime = null;
  if (sessionId) {
    const sessionRes = await pool.request().input('sessionId', sessionId).query('SELECT finalizedDateTime FROM dbo.tblSESSION WHERE sessionId = @sessionId');
    finalizedDateTime = sessionRes.recordset[0]?.finalizedDateTime;
  }

  const whereCondition = sessionId 
    ? 'SessionId = @sessionId' 
    : 'CONVERT(char(10), DATETIME, 23) = @businessDate';

  const incomeWhereCondition = sessionId
    ? 'SessionId = @sessionId'
    : 'CONVERT(char(10), SESSION_START_DATETIME, 23) = @businessDate';

  const salesQuery = `
      SELECT ID AS id, CONVERT(char(10), DATETIME, 23) AS businessDate, F_NO AS flightNo,
        COMPANY AS company, TICKET_TYPE_ID AS ticketType, QTY AS qty,
        CHARGE AS amount, 'counter' AS source, DATETIME AS createdAt, SessionId AS sessionId,
        ISNULL(CREDIT, 0) AS credit
      FROM dbo.TICKETING_C WHERE ${whereCondition}
        AND SERIALNO NOT IN (SELECT SERIALNO FROM dbo.ERRORTICKETING WHERE SERIALNO IS NOT NULL)
      ORDER BY DATETIME DESC`;

  const request = pool.request();
  if (sessionId) {
    request.input('sessionId', sessionId);
  } else {
    request.input('businessDate', businessDate);
  }
  if (finalizedDateTime) {
    request.input('finalizedDateTime', finalizedDateTime);
  }

  const [salesResult, dayResult, incomeResult] = await Promise.all([
    request.query(salesQuery),
    pool.request().input('businessDate', businessDate).input('sessionId', sessionId ?? null).query(
      `SELECT TOP 1 CASE WHEN SESSION_END_DATETIME IS NOT NULL THEN 1 ELSE 0 END AS closed
       FROM dbo.SESSIONINCOME
       WHERE ${incomeWhereCondition}
       ORDER BY SESSION_START_DATETIME DESC`),
    pool.request().input('businessDate', businessDate).input('sessionId', sessionId ?? null).query(
      `SELECT SessionId AS sessionId, SESSION_INCOME AS income, NUMBER_OF_ITEMS AS items,
              START_SERIAL_NO AS startSerialNo, END_SERIAL_NO AS endSerialNo,
              SESSION_START_DATETIME AS startAt, SESSION_END_DATETIME AS endAt,
              TICKET_TYPE AS ticketType, CASH_COUNT AS cashCount,
              SESSION_INCOME_CREDIT AS creditIncome, CREDIT_COUNT AS creditCount
       FROM dbo.SESSIONINCOME
       WHERE ${incomeWhereCondition}
       ORDER BY SESSION_START_DATETIME DESC, TICKET_TYPE ASC`),
  ]);
  const sales = salesResult.recordset.map(row => ({
    ...row,
    ticketType: row.ticketType === 2 || row.ticketType === 3 ? 'PAGING BOARD' : 'GARLANDING',
  }));
  const totals = sales.reduce((total, sale) => {
    const isCredit = sale.credit === 1 || sale.credit === true || sale.credit === '1';
    const amount = Number(sale.amount || 0);
    const qty = Number(sale.qty || 0);
    return {
      tickets: total.tickets + 1,
      items: total.items + qty,
      amount: total.amount + amount,
      cashTickets: total.cashTickets + (isCredit ? 0 : 1),
      creditTickets: total.creditTickets + (isCredit ? 1 : 0),
      cashAmount: total.cashAmount + (isCredit ? 0 : amount),
      creditAmount: total.creditAmount + (isCredit ? amount : 0),
    };
  }, { tickets: 0, items: 0, amount: 0, cashTickets: 0, creditTickets: 0, cashAmount: 0, creditAmount: 0 });
  const sessionIncome = incomeResult.recordset.map(row => ({
    sessionId: row.sessionId,
    income: Number(row.income || 0),
    items: Number(row.items || 0),
    startSerialNo: row.startSerialNo,
    endSerialNo: row.endSerialNo,
    startAt: row.startAt,
    endAt: row.endAt,
    ticketType: row.ticketType === 2 || row.ticketType === 3 ? 'PAGING BOARD' : 'GARLANDING',
    ticketTypeId: row.ticketType,
    cashCount: row.cashCount || 0,
    creditIncome: Number(row.creditIncome || 0),
    creditCount: row.creditCount || 0,
  }));
  return { businessDate, closed: Boolean(dayResult.recordset[0]?.closed), sales, totals, sessionIncome };
}
