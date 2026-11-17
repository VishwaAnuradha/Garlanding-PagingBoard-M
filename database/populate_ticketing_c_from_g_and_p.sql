-- ==============================================================================
-- Script: Insert exact IDs from TICKETING_G and TICKETING_P into TICKETING_C.ID
--         (Prevents auto-generated identity values like 1156, 1157, 1158...)
-- ==============================================================================

USE [Garlanding];
GO

-- 1. Clear the generated 1156+ rows from TICKETING_C
DELETE FROM [dbo].[TICKETING_C];
GO

-- 2. If TICKETING_C has a Primary Key constraint on ID alone, convert it to (TICKET_TYPE_ID, ID)
--    so both Garlanding and Paging Board tickets can store their original IDs (0, 1, 2...) without key collision.
DECLARE @pkName NVARCHAR(200);
SELECT @pkName = i.name 
FROM sys.indexes i 
WHERE i.object_id = OBJECT_ID('dbo.TICKETING_C') AND i.is_primary_key = 1;

IF @pkName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.TICKETING_C DROP CONSTRAINT ' + @pkName);
    ALTER TABLE dbo.TICKETING_C ADD CONSTRAINT PK_TICKETING_C PRIMARY KEY CLUSTERED (TICKET_TYPE_ID, ID);
END
GO

-- 3. Enable IDENTITY_INSERT so SQL Server allows inserting explicit ID values into TICKETING_C
SET IDENTITY_INSERT [dbo].[TICKETING_C] ON;
GO

-- 4. Insert Garlanding tickets with their exact ID from TICKETING_G
INSERT INTO [dbo].[TICKETING_C] (
    ID,
    SERIALNO,
    TICKET_TYPE_ID,
    USERID,
    SESSIONENDFLAG,
    DATETIME,
    CHARGE,
    QTY,
    F_NO,
    COMPANY,
    RECEIPT_NO,
    SessionId,
    CREDIT
)
SELECT 
    g.ID,
    g.SERIALNO,
    ISNULL(g.TICKET_TYPE_ID, 1) AS TICKET_TYPE_ID,
    g.USERID,
    ISNULL(g.SESSIONENDFLAG, 'N') AS SESSIONENDFLAG,
    g.DATETIME,
    g.CHARGE,
    g.QTY,
    g.F_NO,
    g.COMPANY,
    g.ID AS RECEIPT_NO,
    g.SessionId,
    ISNULL(g.CREDIT, 0) AS CREDIT
FROM [dbo].[TICKETING_G] g;
GO

-- 5. Insert Paging Board tickets with their exact ID from TICKETING_P
INSERT INTO [dbo].[TICKETING_C] (
    ID,
    SERIALNO,
    TICKET_TYPE_ID,
    USERID,
    SESSIONENDFLAG,
    DATETIME,
    CHARGE,
    QTY,
    F_NO,
    COMPANY,
    RECEIPT_NO,
    SessionId,
    CREDIT
)
SELECT 
    p.ID,
    p.SERIALNO,
    ISNULL(p.TICKET_TYPE_ID, 2) AS TICKET_TYPE_ID,
    p.USERID,
    ISNULL(p.SESSIONENDFLAG, 'N') AS SESSIONENDFLAG,
    p.DATETIME,
    p.CHARGE,
    p.QTY,
    p.F_NO,
    p.COMPANY,
    p.ID AS RECEIPT_NO,
    p.SessionId,
    ISNULL(p.CREDIT, 0) AS CREDIT
FROM [dbo].[TICKETING_P] p;
GO

-- 6. Disable IDENTITY_INSERT
SET IDENTITY_INSERT [dbo].[TICKETING_C] OFF;
GO

-- 7. Verification Query
SELECT TOP (1000)
    [ID],
    [SERIALNO],
    [TICKET_TYPE_ID],
    [USERID],
    [SESSIONENDFLAG],
    [DATETIME],
    [CHARGE],
    [QTY],
    [F_NO],
    [COMPANY],
    [RECEIPT_NO],
    [SessionId],
    [CREDIT]
FROM [Garlanding].[dbo].[TICKETING_C]
ORDER BY [DATETIME] ASC;
GO
