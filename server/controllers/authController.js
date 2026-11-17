// Import session token creation function
import { createSessionToken } from '../utils/sessionToken.js';

// Import bcrypt for password comparison
import bcrypt from 'bcryptjs';

// Import database connection functions and SQL data types
import {
  connectAirportDatabase,
  getPoolForAirport,
  getUcfePool,
  sql
} from '../config/db.js';

// List of supported airports
const VALID_AIRPORTS = ['BIA', 'CIAR', 'JIA', 'MRIA', 'BTIA'];

// Define login categories and their display names
const LOGIN_CATEGORIES = {
  admin: 'Administrator',
  superAdmin: 'SuperAdmin',
  staff: 'User'
};

// Convert database role ID into application role
export function getApplicationRole(roleId) {
  switch (Number(roleId)) {
    case 1: return 'admin';
    case 2: return 'staff';
    case 3:
    case 4: return 'superAdmin';
    default: return null;
  }
}

// Create the USERS table if it does not exist
// Also update missing or incorrect columns
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

    -- Add Airport column if it does not exist
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'USERS'
      AND COLUMN_NAME = 'Airport'
    )
      ALTER TABLE dbo.USERS ADD Airport NVARCHAR(100) NULL;

    -- Change Shift column to NVARCHAR if it has an incorrect data type
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

// Save login details in the USERS table
// Update existing user records or insert new records
async function recordLogin(ssn, shift, category, airport = 'BIA') {
  try {
    const pool = getPoolForAirport(airport);

    // Pass login details as SQL parameters
    await pool.request()
      .input('userId', sql.NVarChar(50), ssn)
      .input('employeeNo', sql.NVarChar(50), ssn)
      .input('shift', sql.NVarChar(100), shift)
      .input('category', sql.NVarChar(200), category)
      .input('airport', sql.NVarChar(100), airport)
      .input('now', sql.DateTime, new Date())

      // Update existing user or insert a new user
      .query(`
        MERGE dbo.USERS AS target
        USING (SELECT @userId AS UserID) AS source
        ON target.UserID = source.UserID

        WHEN MATCHED THEN
          UPDATE SET
            Password = NULL,
            Shift = @shift,
            Category = @category,
            Airport = @airport,
            DateTime = @now

        WHEN NOT MATCHED THEN
          INSERT (UserID, EmployeeNo, Shift, Category, Airport, DateTime)
          VALUES (@userId, @employeeNo, @shift, @category, @airport, @now);
      `);

  } catch (err) {
    // Log the error without stopping the login process
    console.error('recordLogin error:', err.message);
  }
}

// Handle user login
export async function login(req, res) {

  // Get airport, SSN and password from the frontend
  const airport = String(req.body.airport || 'BIA').trim().toUpperCase();
  const ssn = String(req.body.ssn || '').trim();
  const password = String(req.body.password || '');

  // Check whether required login details are provided
  if (!ssn || !password)
    return res.status(400).json({
      message: 'SSN, password, and airport are required.'
    });

  // Check whether the selected airport is valid
  if (!VALID_AIRPORTS.includes(airport))
    return res.status(400).json({
      message: 'Select a valid airport.'
    });

  let role;

  try {
    // Connect to UCFE database and find the user account
    const result = await getUcfePool().request()
      .input('ssn', sql.NVarChar(50), ssn)
      .query(`
        SELECT TOP (2)
          account.[password],
          systemRole.[role_id]
        FROM [dbo].[tblLogin] AS account

        -- Connect user account with assigned roles
        LEFT JOIN [dbo].[userRole] AS userRole
          ON CONVERT(NVARCHAR(50), userRole.[userId]) =
             CONVERT(NVARCHAR(50), account.[SSN])

        LEFT JOIN [dbo].[systemRole] AS systemRole
          ON systemRole.[sR_id] = userRole.[systemRoleId]

        -- Find the account using the provided SSN
        WHERE CONVERT(NVARCHAR(50), account.[SSN]) = @ssn
        ORDER BY systemRole.[sR_id];
      `);

    // Check account availability and verify the password
    if (result.recordset.length === 0 || !result.recordset[0].password) {
      console.warn(`[Auth] Login failed: No account or password found in UCFE for SSN "${ssn}".`);
      return res.status(401).json({
        message: 'Invalid SSN or password.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, result.recordset[0].password);
    if (!isPasswordValid) {
      console.warn(`[Auth] Login failed: Password mismatch for SSN "${ssn}".`);
      return res.status(401).json({
        message: 'Invalid SSN or password.'
      });
    }

    // Get the application role assigned to the user
    role = getApplicationRole(result.recordset[0].role_id);

    // Reject users without a valid system role
    if (!role)
      return res.status(403).json({
        message: 'No valid system role is assigned to this SSN.'
      });

  } catch (error) {
    // Handle authentication database errors
    console.error('Error authenticating SSN against UCFE:', error);

    return res.status(500).json({
      message: 'Unable to verify login credentials.'
    });
  }

  // Handle administrator and super administrator login
  if (role !== 'staff') {
    try {
      // Connect to the selected airport database
      await connectAirportDatabase(airport);

    } catch (error) {
      // Return an error if the airport database is unavailable
      console.error(
        `Airport database connection failed during ${airport} admin login:`,
        error.message
      );

      return res.status(503).json({
        message: `The ${airport} airport database is unavailable. Check its SQL Server login and database access, then try again.`
      });
    }

    // Get the readable role name
    const roleLabel = LOGIN_CATEGORIES[role];

    // Save administrator login details
    await recordLogin(ssn, '', roleLabel, airport);

    // Generate token and return administrator details
    return res.json({
      token: createSessionToken(ssn, role, null, airport),
      user: {
        epfNumber: ssn,
        ssn,
        role,
        shift: roleLabel,
        airport
      },
    });
  }

  // Handle staff login
  let pool;

  try {
    // Connect to the selected airport database
    pool = await connectAirportDatabase(airport);

  } catch (error) {
    // Handle airport database connection errors
    console.error(
      `Airport database connection failed during ${airport} staff login:`,
      error.message
    );

    return res.status(503).json({
      message: `The ${airport} airport database is unavailable. Check its SQL Server login and database access, then try again.`
    });
  }

  let activeSession;

  try {
    // Find an active session or activate the next available session
    const result = await pool.request().query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;

      -- Automatically close expired active sessions
      UPDATE dbo.tblSESSION
      SET sessionStatus = 'CLOSED'
      WHERE sessionStatus = 'ACTIVE'
      AND sessionEndTime <= GETDATE();

      -- Create a temporary table to store the active session
      DECLARE @activeSession TABLE (
        sessionId INT,
        sessionStartTime DATETIME,
        sessionEndTime DATETIME
      );

      -- Get the most recently activated active session
      INSERT INTO @activeSession (
        sessionId,
        sessionStartTime,
        sessionEndTime
      )
      SELECT TOP 1
        sessionId,
        sessionStartTime,
        sessionEndTime
      FROM dbo.tblSESSION WITH (UPDLOCK, HOLDLOCK)
      WHERE sessionStatus = 'ACTIVE'
      ORDER BY finalizedDateTime DESC, sessionId DESC;

      -- Activate the next available session if no active session exists
      IF NOT EXISTS (SELECT 1 FROM @activeSession)
      BEGIN
        ;WITH nextSession AS (
          SELECT TOP 1
            sessionId,
            sessionStartTime,
            sessionEndTime,
            sessionStatus,
            finalizedDateTime
          FROM dbo.tblSESSION WITH (UPDLOCK, READPAST)
          WHERE sessionStatus IS NULL
          AND sessionEndTime > GETDATE()
          ORDER BY sessionStartTime, sessionId
        )

        -- Update the selected session as ACTIVE
        UPDATE nextSession
        SET
          sessionStatus = 'ACTIVE',
          finalizedDateTime = GETDATE()

        -- Store the activated session details
        OUTPUT
          inserted.sessionId,
          inserted.sessionStartTime,
          inserted.sessionEndTime
        INTO @activeSession (
          sessionId,
          sessionStartTime,
          sessionEndTime
        );
      END;

      -- Return the active session details
      SELECT sessionId, sessionStartTime, sessionEndTime
      FROM @activeSession;

      COMMIT TRANSACTION;
    `);

    // Check whether an active session is available
    if (result.recordset.length === 0) {
      return res.status(403).json({
        message: 'No active shift session. Please wait for an administrator to activate a session.'
      });
    }

    // Store the active session details
    activeSession = result.recordset[0];

  } catch (error) {
    // Handle session checking errors
    console.error('Error checking active session during login:', error);

    return res.status(500).json({
      message: 'Internal server error while checking shift session.'
    });
  }

  // Save staff login details in the USERS table
  await recordLogin(ssn, '', LOGIN_CATEGORIES.staff, airport);

  // Generate authentication token and return staff details
  res.json({
    token: createSessionToken(
      ssn,
      'staff',
      activeSession.sessionId,
      airport
    ),
    user: {
      epfNumber: ssn,
      ssn,
      role: 'staff',
      sessionId: activeSession.sessionId,
      airport
    }
  });
}