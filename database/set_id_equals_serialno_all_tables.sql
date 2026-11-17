-- ==============================================================================
-- Script: set_id_equals_serialno_all_tables.sql
-- Purpose:
--   Sets ID = SERIALNO across all ticket tables:
--     1. dbo.TICKETING_G: ID = SERIALNO (1, 2, 3, 5, 7)
--     2. dbo.TICKETING_P: ID = SERIALNO (1, 2, 3, 4)
--     3. dbo.ERRORTICKETING: ID = SERIALNO (4, 5, 6) with PK (TICKET_TYPE_ID, ID)
--     4. dbo.TICKETING_C: Synchronizes RECEIPT_NO = Sub-ticket SERIALNO
-- ==============================================================================

USE [Garlanding];
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- ==============================================================================
-- 1. FIX dbo.TICKETING_G (ID = SERIALNO)
-- ==============================================================================
PRINT 'Setting ID = SERIALNO in dbo.TICKETING_G...';

IF OBJECT_ID('tempdb..#TempG') IS NOT NULL DROP TABLE #TempG;

SELECT 
    SERIALNO AS NewId,
    ID AS OldId,
    SERIALNO,
    ISNULL(TICKET_TYPE_ID, 1) AS TICKET_TYPE_ID,
    USERID,
    ISNULL(SESSIONENDFLAG, 'N') AS SESSIONENDFLAG,
    DATETIME,
    CHARGE,
    QTY,
    F_NO,
    COMPANY,
    SessionId,
    ISNULL(CREDIT, 0) AS CREDIT
INTO #TempG
FROM dbo.TICKETING_G;

-- Update TICKETING_C.RECEIPT_NO for Garlanding tickets
IF COL_LENGTH('dbo.TICKETING_C', 'RECEIPT_NO') IS NOT NULL
BEGIN
    UPDATE c
    SET c.RECEIPT_NO = t.NewId
    FROM dbo.TICKETING_C c
    JOIN #TempG t ON (c.RECEIPT_NO = t.OldId OR c.SERIALNO = t.SERIALNO) AND c.TICKET_TYPE_ID = 1;
END;

DELETE FROM dbo.TICKETING_G;

SET IDENTITY_INSERT dbo.TICKETING_G ON;

INSERT INTO dbo.TICKETING_G (
    ID, SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME,
    CHARGE, QTY, F_NO, COMPANY, SessionId, CREDIT
)
SELECT 
    NewId, SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME,
    CHARGE, QTY, F_NO, COMPANY, SessionId, CREDIT
FROM #TempG
ORDER BY NewId ASC;

SET IDENTITY_INSERT dbo.TICKETING_G OFF;

DECLARE @MaxGId INT = ISNULL((SELECT MAX(ID) FROM dbo.TICKETING_G), 0);
IF @MaxGId > 0
    DBCC CHECKIDENT ('dbo.TICKETING_G', RESEED, @MaxGId);
ELSE
    DBCC CHECKIDENT ('dbo.TICKETING_G', RESEED, 0);

DROP TABLE #TempG;
PRINT 'dbo.TICKETING_G updated successfully.';
GO

-- ==============================================================================
-- 2. FIX dbo.TICKETING_P (ID = SERIALNO)
-- ==============================================================================
PRINT 'Setting ID = SERIALNO in dbo.TICKETING_P...';

IF OBJECT_ID('tempdb..#TempP') IS NOT NULL DROP TABLE #TempP;

SELECT 
    SERIALNO AS NewId,
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

-- Update TICKETING_C.RECEIPT_NO for Paging Board tickets
IF COL_LENGTH('dbo.TICKETING_C', 'RECEIPT_NO') IS NOT NULL
BEGIN
    UPDATE c
    SET c.RECEIPT_NO = t.NewId
    FROM dbo.TICKETING_C c
    JOIN #TempP t ON (c.RECEIPT_NO = t.OldId OR c.SERIALNO = t.SERIALNO) AND c.TICKET_TYPE_ID IN (2, 3);
END;

DELETE FROM dbo.TICKETING_P;

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

DECLARE @MaxPId INT = ISNULL((SELECT MAX(ID) FROM dbo.TICKETING_P), 0);
IF @MaxPId > 0
    DBCC CHECKIDENT ('dbo.TICKETING_P', RESEED, @MaxPId);
ELSE
    DBCC CHECKIDENT ('dbo.TICKETING_P', RESEED, 0);

DROP TABLE #TempP;
PRINT 'dbo.TICKETING_P updated successfully.';
GO

-- ==============================================================================
-- 3. FIX dbo.ERRORTICKETING (ID = SERIALNO)
-- ==============================================================================
PRINT 'Setting ID = SERIALNO in dbo.ERRORTICKETING...';

-- Drop old Primary Key constraint if present
DECLARE @pkErr NVARCHAR(200);
SELECT @pkErr = i.name 
FROM sys.indexes i 
WHERE i.object_id = OBJECT_ID('dbo.ERRORTICKETING') AND i.is_primary_key = 1;

IF @pkErr IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.ERRORTICKETING DROP CONSTRAINT ' + @pkErr);
END;

-- Update ID and RECEIPT_NO to exactly match SERIALNO
UPDATE dbo.ERRORTICKETING
SET ID = SERIALNO,
    RECEIPT_NO = SERIALNO;

-- Ensure columns are NOT NULL for composite PK
ALTER TABLE dbo.ERRORTICKETING ALTER COLUMN ID INT NOT NULL;
ALTER TABLE dbo.ERRORTICKETING ALTER COLUMN TICKET_TYPE_ID INT NOT NULL;

-- Add Composite Primary Key (TICKET_TYPE_ID, ID)
ALTER TABLE dbo.ERRORTICKETING 
ADD CONSTRAINT PK_ERRORTICKETING PRIMARY KEY CLUSTERED (TICKET_TYPE_ID, ID);

PRINT 'dbo.ERRORTICKETING updated successfully.';
GO

COMMIT TRANSACTION;
GO

-- ==============================================================================
-- VERIFICATION SELECTS
-- ==============================================================================
PRINT '--- Verification: TICKETING_G (ID must equal SERIALNO) ---';
SELECT ID, SERIALNO, TICKET_TYPE_ID, DATETIME, CHARGE, F_NO, COMPANY, SessionId 
FROM dbo.TICKETING_G ORDER BY ID ASC;

PRINT '--- Verification: TICKETING_P (ID must equal SERIALNO) ---';
SELECT ID, SERIALNO, TICKET_TYPE_ID, DATETIME, CHARGE, F_NO, COMPANY, SessionId 
FROM dbo.TICKETING_P ORDER BY ID ASC;

PRINT '--- Verification: ERRORTICKETING (ID must equal SERIALNO) ---';
SELECT ID, SERIALNO, TICKET_TYPE_ID, DATETIME, CHARGE, F_NO, COMPANY, RECEIPT_NO, SessionId 
FROM dbo.ERRORTICKETING ORDER BY TICKET_TYPE_ID ASC, ID ASC;
GO

