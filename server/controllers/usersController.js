import { getPoolForAirport, sql } from '../config/db.js';

const VALID_CATEGORIES = ['SuperAdmin', 'Administrator', 'User'];

/** GET /api/users  — return all users for the admin users page */
export async function getUsers(req, res) {
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const result = await pool.request().query(`
    SELECT UserID, Password, EmployeeNo, Name, Division, Section, Category, Contacts, Address, Shift, DateTime
    FROM dbo.USERS
    ORDER BY UserID ASC
  `);
  res.json(result.recordset);
}

/** POST /api/users  — create a new user */
export async function createUser(req, res) {
  const { userId, password, employeeNo, name, division, section, category, contacts, address, shift } = req.body;
  if (!userId || !password || !employeeNo || !name) {
    return res.status(400).json({ message: 'UserID, Password, EmployeeNo, and Name are required.' });
  }
  if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Category must be SuperAdmin, Administrator, or User.' });

  // Check for duplicate UserID or EmployeeNo
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const dup = await pool.request()
    .input('userId', userId).input('employeeNo', employeeNo)
    .query('SELECT UserID FROM dbo.USERS WHERE UserID = @userId OR EmployeeNo = @employeeNo');
  if (dup.recordset.length) {
    return res.status(409).json({ message: 'A user with this UserID or EmployeeNo already exists.' });
  }

  await pool.request()
    .input('userId',     sql.NVarChar(50),  userId)
    .input('password',   sql.NVarChar(200), password)
    .input('employeeNo', sql.NVarChar(50),  employeeNo)
    .input('name',       sql.NVarChar(200), name       || '')
    .input('division',   sql.NVarChar(200), division   || '')
    .input('section',    sql.NVarChar(200), section    || '')
    .input('category',   sql.NVarChar(200), category   || '')
    .input('contacts',   sql.NVarChar(200), contacts   || '')
    .input('address',    sql.NVarChar(500), address    || '')
    .input('shift',      sql.NVarChar(100), shift      || '')
    .query(`
      INSERT INTO dbo.USERS (UserID, Password, EmployeeNo, Name, Division, Section, Category, Contacts, Address, Shift, DateTime)
      VALUES (@userId, @password, @employeeNo, @name, @division, @section, @category, @contacts, @address, @shift, GETDATE())
    `);

  res.status(201).json({ message: 'User created successfully.' });
}

/** PUT /api/users/:userId  — update an existing user */
export async function updateUser(req, res) {
  const { userId } = req.params;
  const { password, employeeNo, name, division, section, category, contacts, address, shift } = req.body;
  if (!employeeNo || !name) {
    return res.status(400).json({ message: 'EmployeeNo and Name are required.' });
  }
  if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Category must be SuperAdmin, Administrator, or User.' });

  const passwordClause = password ? ', Password = @password' : '';
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const request = pool.request()
    .input('userId',     sql.NVarChar(50),  userId)
    .input('employeeNo', sql.NVarChar(50),  employeeNo)
    .input('name',       sql.NVarChar(200), name       || '')
    .input('division',   sql.NVarChar(200), division   || '')
    .input('section',    sql.NVarChar(200), section    || '')
    .input('category',   sql.NVarChar(200), category   || '')
    .input('contacts',   sql.NVarChar(200), contacts   || '')
    .input('address',    sql.NVarChar(500), address    || '')
    .input('shift',      sql.NVarChar(100), shift      || '');

  if (password) request.input('password', sql.NVarChar(200), password);

  const result = await request.query(`
    UPDATE dbo.USERS
    SET EmployeeNo = @employeeNo, Name = @name, Division = @division,
        Section = @section, Category = @category, Contacts = @contacts,
        Address = @address, Shift = @shift${passwordClause}
    WHERE UserID = @userId
  `);

  if (!result.rowsAffected[0]) return res.status(404).json({ message: 'User not found.' });
  res.json({ message: 'User updated successfully.' });
}

/** DELETE /api/users/:userId  — delete a user */
export async function deleteUser(req, res) {
  const { userId } = req.params;
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const result = await pool.request()
    .input('userId', sql.NVarChar(50), userId)
    .query('DELETE FROM dbo.USERS WHERE UserID = @userId');
  if (!result.rowsAffected[0]) return res.status(404).json({ message: 'User not found.' });
  res.json({ message: 'User deleted successfully.' });
}
