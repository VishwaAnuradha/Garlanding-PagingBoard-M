-- ==============================================================================
-- Script: enforce_id_equals_serialno.sql
-- Purpose:
--   Enforces ID = SERIALNO across all tables:
--     1. dbo.TICKETING_G: ID = SERIALNO (1, 2, 3, 5, 7)
--     2. dbo.TICKETING_P: ID = SERIALNO (1, 2, 3, 4)
--     3. dbo.ERRORTICKETING: ID = SERIALNO (4, 5, 6, 8) with NO auto-identity on ID
--        and Primary Key on (TICKET_TYPE_ID, ID)
--     4. dbo.TICKETING_C: RECEIPT_NO = Sub-ticket SERIALNO
-- ==============================================================================

USE [Garlanding];
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- ==============================================================================
-- 1. FIX dbo.TICKETING_G (Make ID = SERIALNO: 1, 2, 3, 5, 7)
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

-- Update TICKETING_C.RECEIPT_NO to match NewId (= SERIALNO)
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
PRINT 'dbo.TICKETING_G updated successfully (ID = SERIALNO).';

-- ==============================================================================
-- 2. FIX dbo.TICKETING_P (Make ID = SERIALNO: 1, 2, 3, 4)
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
PRINT 'dbo.TICKETING_P updated successfully (ID = SERIALNO).';

-- ==============================================================================
-- 3. FIX dbo.ERRORTICKETING (ID = SERIALNO: 4, 5, 6, 8)
--    Recreate table with plain INT for ID (NO IDENTITY) so ID directly equals SERIALNO.
-- ==============================================================================
PRINT 'Setting ID = SERIALNO in dbo.ERRORTICKETING...';

IF OBJECT_ID('dbo.ERRORTICKETING_PLAIN', 'U') IS NOT NULL
    DROP TABLE dbo.ERRORTICKETING_PLAIN;

CREATE TABLE dbo.ERRORTICKETING_PLAIN (
    ID INT NOT NULL,
    SERIALNO INT NOT NULL,
    TICKET_TYPE_ID INT NOT NULL,
    USERID VARCHAR(50) NULL,
    SESSIONENDFLAG VARCHAR(5) NULL,
    DATETIME DATETIME NULL,
    CHARGE DECIMAL(18, 2) NULL,
    QTY INT NULL,
    F_NO VARCHAR(100) NULL,
    COMPANY VARCHAR(150) NULL,
    RECEIPT_NO INT NULL,
    SessionId INT NULL,
    CREDIT INT DEFAULT 0,
    CONSTRAINT PK_ERRORTICKETING PRIMARY KEY CLUSTERED (TICKET_TYPE_ID, ID)
);

-- Copy existing error tickets setting ID = SERIALNO and RECEIPT_NO = SERIALNO
INSERT INTO dbo.ERRORTICKETING_PLAIN (
    ID, SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME,
    CHARGE, QTY, F_NO, COMPANY, RECEIPT_NO, SessionId, CREDIT
)
SELECT 
    SERIALNO AS ID,             -- << Explicitly set ID = SERIALNO
    SERIALNO,
    TICKET_TYPE_ID,
    USERID,
    ISNULL(SESSIONENDFLAG, 'N'),
    DATETIME,
    CHARGE,
    QTY,
    F_NO,
    COMPANY,
    SERIALNO AS RECEIPT_NO,     -- << Explicitly set RECEIPT_NO = SERIALNO
    SessionId,
    ISNULL(CREDIT, 0)
FROM dbo.ERRORTICKETING;

-- Drop foreign keys referencing dbo.ERRORTICKETING if any
DECLARE @fkSql NVARCHAR(MAX) = N'';
SELECT @fkSql += 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
FROM sys.foreign_keys
WHERE referenced_object_id = OBJECT_ID('dbo.ERRORTICKETING');

IF @fkSql <> N'' EXEC sp_executesql @fkSql;

DROP TABLE dbo.ERRORTICKETING;
EXEC sp_rename 'dbo.ERRORTICKETING_PLAIN', 'ERRORTICKETING';

PRINT 'dbo.ERRORTICKETING updated successfully (ID = SERIALNO).';

COMMIT TRANSACTION;
GO

-- ==============================================================================
-- 4. VERIFICATION (Check all rows: ID must equal SERIALNO)
-- ==============================================================================
PRINT '--- [TICKETING_G] ID must equal SERIALNO ---';
SELECT ID, SERIALNO, TICKET_TYPE_ID, USERID, DATETIME, CHARGE, F_NO, COMPANY, SessionId 
FROM dbo.TICKETING_G ORDER BY ID ASC;

PRINT '--- [TICKETING_P] ID must equal SERIALNO ---';
SELECT ID, SERIALNO, TICKET_TYPE_ID, USERID, DATETIME, CHARGE, F_NO, COMPANY, SessionId 
FROM dbo.TICKETING_P ORDER BY ID ASC;

PRINT '--- [ERRORTICKETING] ID must equal SERIALNO ---';
SELECT ID, SERIALNO, TICKET_TYPE_ID, USERID, DATETIME, CHARGE, F_NO, COMPANY, RECEIPT_NO, SessionId 
FROM dbo.ERRORTICKETING ORDER BY TICKET_TYPE_ID ASC, ID ASC;
GO

