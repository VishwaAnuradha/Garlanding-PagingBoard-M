-- ==============================================================================
-- Script: reseed_paging_and_error_tickets_identity.sql
-- Purpose:
--   1. Reset dbo.TICKETING_P (Paging Board) IDs so they start cleanly from 1
--      (1, 2, 3, 4...) matching the structure of dbo.TICKETING_G, and reseed the identity.
--   2. Convert dbo.ERRORTICKETING so ID is an IDENTITY(1,1) column,
--      renumbering existing error tickets cleanly as 1, 2, 3... and auto-generating future IDs.
--   3. Synchronize RECEIPT_NO in dbo.TICKETING_C and dbo.ERRORTICKETING.
-- ==============================================================================

USE [Garlanding];
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- ==============================================================================
-- STEP 1: RESEED AND RENUMBER dbo.TICKETING_P (PAGING BOARD)
-- ==============================================================================
PRINT 'Processing dbo.TICKETING_P...';

IF OBJECT_ID('tempdb..#TempP') IS NOT NULL DROP TABLE #TempP;

-- Store existing Paging Board records with sequential NewId (1, 2, 3, 4...)
SELECT 
    ROW_NUMBER() OVER (ORDER BY DATETIME ASC, ID ASC) AS NewId,
    ID AS OldId,
    SERIALNO,
    ISNULL(TICKET_TYPE_ID, 2) AS TICKET_TYPE_ID,
    USERID,
    ISNULL(SESSIONENDFLAG, 'N') AS SESSIONENDFLAG,
    DATETIME,
    CHARGE,
    QTY,
    F_NO,
    COMPANY,
    ISNULL(verified, 0) AS verified,
    verifiedDatetime,
    SessionId,
    ISNULL(CREDIT, 0) AS CREDIT
INTO #TempP
FROM dbo.TICKETING_P;

-- Update TICKETING_C.RECEIPT_NO to point to the new sequential IDs
IF COL_LENGTH('dbo.TICKETING_C', 'RECEIPT_NO') IS NOT NULL
BEGIN
    UPDATE c
    SET c.RECEIPT_NO = t.NewId
    FROM dbo.TICKETING_C c
    JOIN #TempP t ON c.RECEIPT_NO = t.OldId AND c.TICKET_TYPE_ID IN (2, 3);
END;

-- Update ERRORTICKETING.RECEIPT_NO if any error ticket referenced old Paging Board IDs
IF COL_LENGTH('dbo.ERRORTICKETING', 'RECEIPT_NO') IS NOT NULL
BEGIN
    UPDATE e
    SET e.RECEIPT_NO = t.NewId
    FROM dbo.ERRORTICKETING e
    JOIN #TempP t ON e.RECEIPT_NO = t.OldId AND e.TICKET_TYPE_ID IN (2, 3);
END;

-- Truncate / clear TICKETING_P
DELETE FROM dbo.TICKETING_P;

-- Re-insert with clean identity IDs starting from 1
SET IDENTITY_INSERT dbo.TICKETING_P ON;

INSERT INTO dbo.TICKETING_P (
    ID, SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME,
    CHARGE, QTY, F_NO, COMPANY, verified, verifiedDatetime, SessionId, CREDIT
)
SELECT 
    NewId, SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME,
    CHARGE, QTY, F_NO, COMPANY, verified, verifiedDatetime, SessionId, CREDIT
FROM #TempP
ORDER BY NewId ASC;

SET IDENTITY_INSERT dbo.TICKETING_P OFF;

-- Reseed identity to the current maximum ID
DECLARE @MaxPId INT = ISNULL((SELECT MAX(ID) FROM dbo.TICKETING_P), 0);
IF @MaxPId > 0
    DBCC CHECKIDENT ('dbo.TICKETING_P', RESEED, @MaxPId);
ELSE
    DBCC CHECKIDENT ('dbo.TICKETING_P', RESEED, 0);

DROP TABLE #TempP;
PRINT 'dbo.TICKETING_P successfully renumbered and reseeded.';
GO

-- ==============================================================================
-- STEP 2: MAKE dbo.ERRORTICKETING AN IDENTITY(1,1) TABLE
-- ==============================================================================
PRINT 'Processing dbo.ERRORTICKETING...';

IF OBJECT_ID('dbo.ERRORTICKETING_NEW', 'U') IS NOT NULL
    DROP TABLE dbo.ERRORTICKETING_NEW;

-- Create the new structure with ID as an explicit IDENTITY(1,1)
CREATE TABLE dbo.ERRORTICKETING_NEW (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    SERIALNO INT NULL,
    TICKET_TYPE_ID INT NULL,
    USERID VARCHAR(50) NULL,
    SESSIONENDFLAG VARCHAR(5) NULL,
    DATETIME DATETIME NULL,
    CHARGE DECIMAL(18, 2) NULL,
    QTY INT NULL,
    F_NO VARCHAR(100) NULL,
    COMPANY VARCHAR(150) NULL,
    RECEIPT_NO INT NULL,
    SessionId INT NULL,
    CREDIT INT DEFAULT 0
);

-- Copy existing error tickets in chronological order (ID auto-increments: 1, 2, 3...)
INSERT INTO dbo.ERRORTICKETING_NEW (
    SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME,
    CHARGE, QTY, F_NO, COMPANY, RECEIPT_NO, SessionId, CREDIT
)
SELECT 
    SERIALNO,
    TICKET_TYPE_ID,
    USERID,
    ISNULL(SESSIONENDFLAG, 'N'),
    DATETIME,
    CHARGE,
    QTY,
    F_NO,
    COMPANY,
    RECEIPT_NO,
    SessionId,
    ISNULL(CREDIT, 0)
FROM dbo.ERRORTICKETING
ORDER BY DATETIME ASC, ID ASC;

-- Drop any foreign key constraints referencing dbo.ERRORTICKETING if any exist
DECLARE @fkSql NVARCHAR(MAX) = N'';
SELECT @fkSql += 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
FROM sys.foreign_keys
WHERE referenced_object_id = OBJECT_ID('dbo.ERRORTICKETING');

IF @fkSql <> N'' EXEC sp_executesql @fkSql;

-- Replace old table with new identity table
DROP TABLE dbo.ERRORTICKETING;
EXEC sp_rename 'dbo.ERRORTICKETING_NEW', 'ERRORTICKETING';

-- Reseed identity
DECLARE @MaxErrId INT = ISNULL((SELECT MAX(ID) FROM dbo.ERRORTICKETING), 0);
IF @MaxErrId > 0
    DBCC CHECKIDENT ('dbo.ERRORTICKETING', RESEED, @MaxErrId);
ELSE
    DBCC CHECKIDENT ('dbo.ERRORTICKETING', RESEED, 0);

PRINT 'dbo.ERRORTICKETING successfully converted to IDENTITY(1,1).';
GO

COMMIT TRANSACTION;
GO

-- ==============================================================================
-- VERIFICATION SELECTS
-- ==============================================================================
PRINT '--- Verification Results ---';

SELECT TOP 10 [ID], [SERIALNO], [TICKET_TYPE_ID], [USERID], [DATETIME], [CHARGE], [F_NO], [COMPANY], [SessionId]
FROM dbo.TICKETING_G
ORDER BY ID ASC;

SELECT TOP 10 [ID], [SERIALNO], [TICKET_TYPE_ID], [USERID], [DATETIME], [CHARGE], [F_NO], [COMPANY], [SessionId]
FROM dbo.TICKETING_P
ORDER BY ID ASC;

SELECT TOP 10 [ID], [SERIALNO], [TICKET_TYPE_ID], [USERID], [DATETIME], [CHARGE], [F_NO], [COMPANY], [RECEIPT_NO], [SessionId]
FROM dbo.ERRORTICKETING
ORDER BY ID ASC;
GO

