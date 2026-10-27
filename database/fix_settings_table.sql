-- ============================================================
-- fix_settings_table.sql
-- Brings the legacy dbo.tblSettings table up to the schema the API
-- expects.  Some databases already contain a tblSettings table with
-- only legacy columns (ID, Description, Remarks), so the CREATE TABLE
-- in active_sessions_setting.sql was skipped and the application
-- columns were never added.  This script adds the missing columns
-- and seeds the single settings row the API reads and writes.
--
-- Idempotent: safe to run more than once.
-- Run in SSMS, or from the server with: node server/fix-settings.js
-- ============================================================

-- Ensure the table itself exists with the full application schema.
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
END
GO

-- Add the application columns that are missing (legacy copies only have
-- ID, Description and Remarks).
IF COL_LENGTH('dbo.tblSettings', 'SystemName') IS NULL
  ALTER TABLE dbo.tblSettings ADD SystemName NVARCHAR(200) NOT NULL
    CONSTRAINT DF_tblSettings_SystemName DEFAULT N'Garlanding Ticket Counter';
GO

IF COL_LENGTH('dbo.tblSettings', 'CounterName') IS NULL
  ALTER TABLE dbo.tblSettings ADD CounterName NVARCHAR(200) NOT NULL
    CONSTRAINT DF_tblSettings_CounterName DEFAULT N'Arrival Counter';
GO

IF COL_LENGTH('dbo.tblSettings', 'PrinterName') IS NULL
  ALTER TABLE dbo.tblSettings ADD PrinterName NVARCHAR(200) NULL;
GO

IF COL_LENGTH('dbo.tblSettings', 'GarlandingPrice') IS NULL
  ALTER TABLE dbo.tblSettings ADD GarlandingPrice DECIMAL(18, 2) NOT NULL
    CONSTRAINT DF_tblSettings_GarlandingPrice DEFAULT 500;
GO

IF COL_LENGTH('dbo.tblSettings', 'PagingBoardPrice') IS NULL
  ALTER TABLE dbo.tblSettings ADD PagingBoardPrice DECIMAL(18, 2) NOT NULL
    CONSTRAINT DF_tblSettings_PagingBoardPrice DEFAULT 300;
GO

IF COL_LENGTH('dbo.tblSettings', 'UpdatedAt') IS NULL
  ALTER TABLE dbo.tblSettings ADD UpdatedAt DATETIME2 NULL;
GO

-- Seed the single settings row the API reads.  The legacy table's ID
-- column is IDENTITY, so IDENTITY_INSERT is needed to place row Id = 1.
IF NOT EXISTS (SELECT 1 FROM dbo.tblSettings WHERE Id = 1)
BEGIN
  IF COLUMNPROPERTY(OBJECT_ID('dbo.tblSettings'), 'ID', 'IsIdentity') = 1
    SET IDENTITY_INSERT dbo.tblSettings ON;

  INSERT INTO dbo.tblSettings (Id, SystemName, CounterName, PrinterName, GarlandingPrice, PagingBoardPrice, UpdatedAt)
  VALUES (1, N'Garlanding Ticket Counter', N'Arrival Counter', N'', 500, 300, SYSUTCDATETIME());

  IF COLUMNPROPERTY(OBJECT_ID('dbo.tblSettings'), 'ID', 'IsIdentity') = 1
    SET IDENTITY_INSERT dbo.tblSettings OFF;
END
GO

PRINT 'tblSettings schema is up to date.';
GO