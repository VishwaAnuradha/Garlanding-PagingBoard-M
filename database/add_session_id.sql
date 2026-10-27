-- ============================================================
-- add_session_id.sql
-- Adds the SessionId column to the sales tables that lack it and
-- backfills existing rows from the session time ranges defined in
-- dbo.tblSESSION so every recorded sale shows the session it ran in.
--
-- dbo.TICKETING_G and dbo.TICKETING_P already have a SessionId
-- column (currently NULL), so they are only backfilled here.
-- ============================================================

IF COL_LENGTH('dbo.TICKETING_C', 'SessionId') IS NULL
BEGIN
  ALTER TABLE dbo.TICKETING_C ADD SessionId INT NULL;
END
GO

IF COL_LENGTH('dbo.SESSIONINCOME', 'SessionId') IS NULL
BEGIN
  ALTER TABLE dbo.SESSIONINCOME ADD SessionId INT NULL;
END
GO

IF COL_LENGTH('dbo.TICKETING_C', 'CREDIT') IS NULL
BEGIN
  ALTER TABLE dbo.TICKETING_C ADD CREDIT INT NOT NULL CONSTRAINT DF_TICKETING_C_CREDIT DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.TICKETING_G', 'CREDIT') IS NULL
BEGIN
  ALTER TABLE dbo.TICKETING_G ADD CREDIT INT NOT NULL CONSTRAINT DF_TICKETING_G_CREDIT DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.TICKETING_P', 'CREDIT') IS NULL
BEGIN
  ALTER TABLE dbo.TICKETING_P ADD CREDIT INT NOT NULL CONSTRAINT DF_TICKETING_P_CREDIT DEFAULT 0;
END
GO

-- Backfill dbo.TICKETING_G
UPDATE g
SET g.SessionId = s.sessionId
FROM dbo.TICKETING_G g
CROSS APPLY (
  SELECT TOP 1 sessionId
  FROM dbo.tblSESSION
  WHERE sessionStartTime <= g.DATETIME AND g.DATETIME < sessionEndTime
  ORDER BY sessionStartTime DESC, sessionId DESC
) s
WHERE g.SessionId IS NULL;
GO

-- Backfill dbo.TICKETING_P
UPDATE p
SET p.SessionId = s.sessionId
FROM dbo.TICKETING_P p
CROSS APPLY (
  SELECT TOP 1 sessionId
  FROM dbo.tblSESSION
  WHERE sessionStartTime <= p.DATETIME AND p.DATETIME < sessionEndTime
  ORDER BY sessionStartTime DESC, sessionId DESC
) s
WHERE p.SessionId IS NULL;
GO

-- Backfill dbo.TICKETING_C
UPDATE c
SET c.SessionId = s.sessionId
FROM dbo.TICKETING_C c
CROSS APPLY (
  SELECT TOP 1 sessionId
  FROM dbo.tblSESSION
  WHERE sessionStartTime <= c.DATETIME AND c.DATETIME < sessionEndTime
  ORDER BY sessionStartTime DESC, sessionId DESC
) s
WHERE c.SessionId IS NULL;
GO

-- Backfill dbo.SESSIONINCOME using its recorded session start time
UPDATE i
SET i.SessionId = s.sessionId
FROM dbo.SESSIONINCOME i
CROSS APPLY (
  SELECT TOP 1 sessionId
  FROM dbo.tblSESSION
  WHERE sessionStartTime <= i.SESSION_START_DATETIME AND i.SESSION_START_DATETIME < sessionEndTime
  ORDER BY sessionStartTime DESC, sessionId DESC
) s
WHERE i.SessionId IS NULL;
GO

PRINT 'SessionId migration complete.';
GO