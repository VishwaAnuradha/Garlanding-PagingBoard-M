import sql from 'mssql';

const localConfig = {
  server: process.env.LOCAL_SQL_SERVER || 'localhost',
  database: 'HR_EMPLOYEE',
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD || 'sa123',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 60000,
};

const remoteConfig = {
  server: process.env.REMOTE_SQL_SERVER || '10.64.30.48',
  database: 'HR_EMPLOYEE',
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD || 'sa123',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 60000,
};

async function copyEmployees() {
  console.log('Connecting to localhost (source) and 10.64.30.48 (destination)...');
  const localPool = await new sql.ConnectionPool(localConfig).connect();
  const remotePool = await new sql.ConnectionPool(remoteConfig).connect();

  console.log('Fetching employees from localhost.dbo.Employee...');
  const result = await localPool.request().query('SELECT * FROM [dbo].[Employee]');
  const rows = result.recordset;
  console.log(`Found ${rows.length} employee record(s) on localhost.`);

  if (rows.length === 0) {
    console.log('No employee records found to copy.');
    process.exit(0);
  }

  // Get column names
  const columns = Object.keys(rows[0]);
  const colList = columns.map(c => `[${c}]`).join(', ');

  console.log('Copying records to 10.64.30.48.dbo.Employee...');
  let copied = 0;

  for (const row of rows) {
    const req = remotePool.request();
    const paramNames = [];

    columns.forEach((col, idx) => {
      const param = `p${idx}`;
      paramNames.push(`@${param}`);
      req.input(param, row[col]);
    });

    const query = `
      IF NOT EXISTS (SELECT 1 FROM [dbo].[Employee] WHERE [service_no] = @p0)
      BEGIN
        IF COLUMNPROPERTY(OBJECT_ID('dbo.Employee'), 'service_no', 'IsIdentity') = 1
        BEGIN
          SET IDENTITY_INSERT [dbo].[Employee] ON;
          INSERT INTO [dbo].[Employee] (${colList}) VALUES (${paramNames.join(', ')});
          SET IDENTITY_INSERT [dbo].[Employee] OFF;
        END
        ELSE
        BEGIN
          INSERT INTO [dbo].[Employee] (${colList}) VALUES (${paramNames.join(', ')});
        END
      END
    `;

    try {
      await req.query(query);
      copied++;
    } catch (err) {
      console.warn(`Skipped/Error on service_no ${row.service_no}:`, err.message);
    }
  }

  console.log(`Successfully synced ${copied} employee(s) to 10.64.30.48!`);
  await localPool.close();
  await remotePool.close();
  process.exit(0);
}

copyEmployees().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
