-- ============================================================
-- split_session_income_rows.sql
-- Creates two separate rows (Garlanding ticketType = 1 and
-- Paging Board ticketType = 2) for each session ID in dbo.SESSIONINCOME.
-- ============================================================

UPDATE legacyIncome
SET TICKET_TYPE = 2
FROM dbo.SESSIONINCOME AS legacyIncome
WHERE legacyIncome.TICKET_TYPE = 3
  AND NOT EXISTS (
    SELECT 1 FROM dbo.SESSIONINCOME AS currentIncome
    WHERE currentIncome.SESSION_START_DATETIME = legacyIncome.SESSION_START_DATETIME
      AND (currentIncome.SessionId = legacyIncome.SessionId OR (currentIncome.SessionId IS NULL AND legacyIncome.SessionId IS NULL))
      AND currentIncome.TICKET_TYPE = 2
  );

IF EXISTS (SELECT 1 FROM dbo.SESSIONINCOME)
BEGIN
  -- Backfill / align existing records in dbo.SESSIONINCOME to have 2 rows per SessionId
  MERGE dbo.SESSIONINCOME AS target
  USING (
    SELECT 
      s.sessionId AS SessionId,
      t.ticketTypeId AS TicketType,
      MIN(c.SERIALNO) AS StartSerialNo,
      MAX(c.SERIALNO) AS EndSerialNo,
      ISNULL(SUM(c.CHARGE), 0) AS Income,
      ISNULL(SUM(c.QTY), 0) AS Items,
      ISNULL(SUM(CASE WHEN c.SERIALNO IS NOT NULL AND ISNULL(c.CREDIT, 0) = 0 THEN 1 ELSE 0 END), 0) AS CashCount,
      ISNULL(SUM(CASE WHEN c.SERIALNO IS NOT NULL AND ISNULL(c.CREDIT, 0) = 1 THEN c.CHARGE ELSE 0 END), 0) AS CreditIncome,
      ISNULL(SUM(CASE WHEN c.SERIALNO IS NOT NULL AND ISNULL(c.CREDIT, 0) = 1 THEN 1 ELSE 0 END), 0) AS CreditCount,
      MIN(s.sessionStartTime) AS SessionStart,
      MAX(i.SESSION_END_DATETIME) AS ExistingEnd
    FROM dbo.tblSESSION s
    CROSS JOIN (SELECT 1 AS ticketTypeId UNION ALL SELECT 2 AS ticketTypeId) t
    LEFT JOIN dbo.SESSIONINCOME i ON i.SessionId = s.sessionId
    LEFT JOIN dbo.TICKETING_C c ON c.SessionId = s.sessionId
      AND (c.TICKET_TYPE_ID = t.ticketTypeId OR (t.ticketTypeId = 2 AND c.TICKET_TYPE_ID = 3))
    WHERE EXISTS (SELECT 1 FROM dbo.SESSIONINCOME ex WHERE ex.SessionId = s.sessionId)
       OR EXISTS (SELECT 1 FROM dbo.TICKETING_C tc WHERE tc.SessionId = s.sessionId)
    GROUP BY s.sessionId, t.ticketTypeId
  ) AS src
  ON (target.SessionId = src.SessionId AND target.TICKET_TYPE = src.TicketType)
  WHEN MATCHED THEN
    UPDATE SET
      START_SERIAL_NO = src.StartSerialNo,
      END_SERIAL_NO = src.EndSerialNo,
      SESSION_INCOME = src.Income,
      NUMBER_OF_ITEMS = src.Items,
      NUMBER_OF_VISITORS = src.Items,
      CASH_COUNT = src.CashCount,
      SESSION_INCOME_CREDIT = src.CreditIncome,
      CREDIT_COUNT = src.CreditCount,
      SESSION_START_DATETIME = COALESCE(target.SESSION_START_DATETIME, src.SessionStart),
      SESSION_END_DATETIME = COALESCE(target.SESSION_END_DATETIME, src.ExistingEnd)
  WHEN NOT MATCHED THEN
    INSERT (SESSION_START_DATETIME, SESSION_END_DATETIME, START_SERIAL_NO, END_SERIAL_NO, SESSION_INCOME, NUMBER_OF_ITEMS, NUMBER_OF_VISITORS, TICKET_TYPE, CASH_COUNT, SESSION_INCOME_CREDIT, CREDIT_COUNT, SessionId)
    VALUES (src.SessionStart, src.ExistingEnd, src.StartSerialNo, src.EndSerialNo, src.Income, src.Items, src.Items, src.TicketType, src.CashCount, src.CreditIncome, src.CreditCount, src.SessionId);
END;
GO
