-- ============================================================
-- add_errorticketing_columns.sql
-- Idempotently ensures session and payment columns exist on dbo.ERRORTICKETING
-- ============================================================

IF COL_LENGTH('dbo.ERRORTICKETING', 'SessionId') IS NULL
BEGIN
  ALTER TABLE dbo.ERRORTICKETING ADD SessionId INT NULL;
END
GO

IF COL_LENGTH('dbo.ERRORTICKETING', 'CREDIT') IS NULL
BEGIN
  ALTER TABLE dbo.ERRORTICKETING ADD CREDIT INT NOT NULL CONSTRAINT DF_ERRORTICKETING_CREDIT DEFAULT 0;
END
GO
