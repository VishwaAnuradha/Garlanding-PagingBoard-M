IF OBJECT_ID('dbo.tblSESSION', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tblSESSION (
    sessionId INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_tblSESSION PRIMARY KEY,
    sessionStartTime DATETIME NOT NULL,
    sessionEndTime DATETIME NOT NULL,
    shiftType NVARCHAR(50) NOT NULL,
    sessionStatus NVARCHAR(20) NULL,
    finalizedDateTime DATETIME NULL
  );
END;
GO

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
END;
GO

IF COL_LENGTH('dbo.tblSettings', 'MaxActiveSessions') IS NOT NULL
BEGIN
  DECLARE @constraintName NVARCHAR(200) = (
    SELECT dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.tblSettings')
      AND c.name = 'MaxActiveSessions'
  );

  IF @constraintName IS NOT NULL
  BEGIN
    EXEC('ALTER TABLE dbo.tblSettings DROP CONSTRAINT ' + QUOTENAME(@constraintName));
  END;

  ALTER TABLE dbo.tblSettings DROP COLUMN MaxActiveSessions;
END;
GO
