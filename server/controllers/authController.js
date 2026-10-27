import { createSessionToken } from '../utils/sessionToken.js';
import bcrypt from 'bcryptjs';
import { connectAirportDatabase, getPoolForAirport, getUcfePool, sql } from '../config/db.js';

const VALID_AIRPORTS = ['BIA', 'CIAR', 'JIA', 'MRIA', 'BTIA'];
const LOGIN_CATEGORIES = { admin: 'Administrator', superAdmin: 'SuperAdmin', staff: 'User' };

export function getApplicationRole(roleId) {
  switch (Number(roleId)) {
    case 1: return 'admin';
    case 2: return 'staff';
    case 3:
    case 4: return 'superAdmin';
    default: return null;
  }
}

export async function ensureUsersSchema(airport = 'BIA') {
  const pool = getPoolForAirport(airport);
  await pool.request().query(`
    IF OBJECT_ID('dbo.USERS', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.USERS (
        UserID NVARCHAR(50) NOT NULL CONSTRAINT PK_USERS PRIMARY KEY,
        Password NVARCHAR(200) NULL,
        EmployeeNo NVARCHAR(50) NULL,
        Division NVARCHAR(200) NULL,
        Section NVARCHAR(200) NULL,
        Category NVARCHAR(200) NULL,
        Contacts NVARCHAR(200) NULL,
        Address NVARCHAR(500) NULL,
        Name NVARCHAR(200) NULL,
        DateTime DATETIME NULL,
        Shift NVARCHAR(100) NULL,
        Airport NVARCHAR(100) NULL
      );
    END;

    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'USERS' AND COLUMN_NAME = 'Airport'
    )
      ALTER TABLE dbo.USERS ADD Airport NVARCHAR(100) NULL;

    IF EXISTS (
      SELECT 1 FROM sys.columns c
      INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID('dbo.USERS')
        AND c.name = 'Shift'
        AND t.name NOT IN ('varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext')
    )
      ALTER TABLE dbo.USERS ALTER COLUMN Shift NVARCHAR(100) NULL;
  `);
}

/** Record the login in dbo.USERS (upsert by EmployeeNo / UserID). */
async function recordLogin(ssn, shift, category, airport = 'BIA') {
  try {
    const pool = getPoolForAirport(airport);

    await pool.request()
      .input('userId',     sql.NVarChar(50),  ssn)
      .input('employeeNo', sql.NVarChar(50),  ssn)
      .input('shift',      sql.NVarChar(100), shift)
      .input('category',   sql.NVarChar(200), category)
      .input('airport',    sql.NVarChar(100), airport)
      .input('now',        sql.DateTime,      new Date())
      .query(`
        MERGE dbo.USERS AS target
        USING (SELECT @userId AS UserID) AS source ON target.UserID = source.UserID
        WHEN MATCHED THEN
          UPDATE SET Password = NULL, Shift = @shift, Category = @category, Airport = @airport, DateTime = @now
        WHEN NOT MATCHED THEN
          INSERT (UserID, EmployeeNo, Shift, Category, Airport, DateTime)
          VALUES (@userId, @employeeNo, @shift, @category, @airport, @now);
      `);
  } catch (err) {
    // Non-critical — log but don't block the login response
    console.error('recordLogin error:', err.message);
  }
}

export async function login(req, res) {
  const airport = String(req.body.airport || 'BIA').trim().toUpperCase();
  const ssn = String(req.body.ssn || '').trim();
  const password = String(req.body.password || '');

  if (!ssn || !password) return res.status(400).json({ message: 'SSN, password, and airport are required.' });
  if (!VALID_AIRPORTS.includes(airport)) return res.status(400).json({ message: 'Select a valid airport.' });

  let role;
  try {
    const result = await getUcfePool().request()
      .input('ssn', sql.NVarChar(50), ssn)
      .query(`
        SELECT TOP (2)
          account.[password],
          systemRole.[role_id]
        FROM [dbo].[tblLogin] AS account
        LEFT JOIN [dbo].[userRole] AS userRole
          ON CONVERT(NVARCHAR(50), userRole.[userId]) = CONVERT(NVARCHAR(50), account.[SSN])
        LEFT JOIN [dbo].[systemRole] AS systemRole
          ON systemRole.[sR_id] = userRole.[systemRoleId]
        WHERE CONVERT(NVARCHAR(50), account.[SSN]) = @ssn
        ORDER BY systemRole.[sR_id];
      `);

    if (result.recordset.length !== 1
      || !result.recordset[0].password
      || !await bcrypt.compare(password, result.recordset[0].password)) {
      return res.status(401).json({ message: 'Invalid SSN or password.' });
    }

    role = getApplicationRole(result.recordset[0].role_id);
    if (!role) return res.status(403).json({ message: 'No valid system role is assigned to this SSN.' });
  } catch (error) {
    console.error('Error authenticating SSN against UCFE:', error);
    return res.status(500).json({ message: 'Unable to verify login credentials.' });
  }

  if (role !== 'staff') {
    try {
      await connectAirportDatabase(airport);
    } catch (error) {
      console.error(`Airport database connection failed during ${airport} admin login:`, error.message);
      return res.status(503).json({
        message: `The ${airport} airport database is unavailable. Check its SQL Server login and database access, then try again.`
      });
    }
    const roleLabel = LOGIN_CATEGORIES[role];
    await recordLogin(ssn, '', roleLabel, airport);
    return res.json({
      token: createSessionToken(ssn, role, null, airport),
      user: { epfNumber: ssn, ssn, role, shift: roleLabel, airport },
    });
  }

  let pool;
  try {
    pool = await connectAirportDatabase(airport);
  } catch (error) {
    console.error(`Airport database connection failed during ${airport} staff login:`, error.message);
    return res.status(503).json({
      message: `The ${airport} airport database is unavailable. Check its SQL Server login and database access, then try again.`
    });
  }

  let activeSession;
  try {
    // Older data may contain more than one ACTIVE row.  Always use the session
    // most recently activated, rather than an arbitrary row returned by SQL
    // Server, so an expired session cannot block the currently selected one.
    const result = await pool.request().query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;

      -- Automatically close any active session that has expired
      UPDATE dbo.tblSESSION 
      SET sessionStatus = 'CLOSED' 
      WHERE sessionStatus = 'ACTIVE' AND sessionEndTime <= GETDATE();

      DECLARE @activeSession TABLE (sessionId INT, sessionStartTime DATETIME, sessionEndTime DATETIME);

      INSERT INTO @activeSession (sessionId, sessionStartTime, sessionEndTime)
      SELECT TOP 1 sessionId, sessionStartTime, sessionEndTime
      FROM dbo.tblSESSION WITH (UPDLOCK, HOLDLOCK)
      WHERE sessionStatus = 'ACTIVE'
      ORDER BY finalizedDateTime DESC, sessionId DESC;

      IF NOT EXISTS (SELECT 1 FROM @activeSession)
      BEGIN
        ;WITH nextSession AS (
          SELECT TOP 1 sessionId, sessionStartTime, sessionEndTime, sessionStatus, finalizedDateTime
          FROM dbo.tblSESSION WITH (UPDLOCK, READPAST)
          WHERE sessionStatus IS NULL 
            AND sessionEndTime > GETDATE()
          ORDER BY sessionStartTime, sessionId
        )
        UPDATE nextSession
        SET sessionStatus = 'ACTIVE', finalizedDateTime = GETDATE()
        OUTPUT inserted.sessionId, inserted.sessionStartTime, inserted.sessionEndTime
        INTO @activeSession (sessionId, sessionStartTime, sessionEndTime);
      END;

      SELECT sessionId, sessionStartTime, sessionEndTime FROM @activeSession;
      COMMIT TRANSACTION;
    `);
    if (result.recordset.length === 0) {
      return res.status(403).json({ message: 'No active shift session. Please wait for an administrator to activate a session.' });
    }
    activeSession = result.recordset[0];
    
    // When the previous counter session has been closed, the next created
    // session is activated atomically for the next staff login.
  } catch (error) {
    console.error('Error checking active session during login:', error);
    return res.status(500).json({ message: 'Internal server error while checking shift session.' });
  }

  // Save this login to dbo.USERS so it's visible in SSMS
  await recordLogin(ssn, '', LOGIN_CATEGORIES.staff, airport);

  res.json({ token: createSessionToken(ssn, 'staff', activeSession.sessionId, airport), user: { epfNumber: ssn, ssn, role: 'staff', sessionId: activeSession.sessionId, airport } });
}
