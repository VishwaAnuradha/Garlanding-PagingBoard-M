-- ==============================================================================
-- Script: Update dbo.TICKETING_C.RECEIPT_NO to store the ID from dbo.TICKETING_G
--         and dbo.TICKETING_P instead of their SERIALNO.
-- ==============================================================================

USE [Garlanding];
GO

-- 1. Update Garlanding sales (TICKET_TYPE_ID = 1)
-- Matches TICKETING_C with TICKETING_G by SERIALNO or by DATETIME + USERID + F_NO
UPDATE c
SET c.RECEIPT_NO = g.ID
FROM [dbo].[TICKETING_C] c
CROSS APPLY (
  SELECT TOP 1 g.ID
  FROM [dbo].[TICKETING_G] g
  WHERE (c.RECEIPT_NO = g.SERIALNO)
     OR (c.DATETIME = g.DATETIME AND c.USERID = g.USERID AND ISNULL(c.F_NO, '') = ISNULL(g.F_NO, ''))
  ORDER BY CASE WHEN c.RECEIPT_NO = g.SERIALNO THEN 0 ELSE 1 END, g.ID DESC
) g
WHERE c.TICKET_TYPE_ID = 1;
GO

-- 2. Update Paging Board sales (TICKET_TYPE_ID IN (2, 3))
-- Matches TICKETING_C with TICKETING_P by SERIALNO or by DATETIME + USERID + F_NO
UPDATE c
SET c.RECEIPT_NO = p.ID
FROM [dbo].[TICKETING_C] c
CROSS APPLY (
  SELECT TOP 1 p.ID
  FROM [dbo].[TICKETING_P] p
  WHERE (c.RECEIPT_NO = p.SERIALNO)
     OR (c.DATETIME = p.DATETIME AND c.USERID = p.USERID AND ISNULL(c.F_NO, '') = ISNULL(p.F_NO, ''))
  ORDER BY CASE WHEN c.RECEIPT_NO = p.SERIALNO THEN 0 ELSE 1 END, p.ID DESC
) p
WHERE c.TICKET_TYPE_ID IN (2, 3);
GO

-- 3. Verification Query to check TICKETING_C with the sub-table IDs
SELECT TOP (100)
    c.ID,
    c.SERIALNO,
    c.TICKET_TYPE_ID,
    c.USERID,
    c.SESSIONENDFLAG,
    c.DATETIME,
    c.CHARGE,
    c.QTY,
    c.F_NO,
    c.COMPANY,
    c.RECEIPT_NO,
    c.SessionId,
    c.CREDIT
FROM [dbo].[TICKETING_C] c
ORDER BY c.ID DESC;
GO

