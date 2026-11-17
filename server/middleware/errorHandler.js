export function errorHandler(error, req, res, _next) {
  console.error(`${req.method} ${req.originalUrl}`, error);

  // SQL Server connection errors
  const code = error.code || '';
  const msg = error.message || '';

  if (code === 'ESOCKET' || code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) {
    return res.status(503).json({
      message: 'SQL Server is not reachable. Please check if the SQL Server service is running.'
    });
  }

  if (code === 'ETIMEOUT' || msg.includes('connect ETIMEOUT') || msg.includes('Connection timeout')) {
    return res.status(503).json({
      message: 'SQL Server connection timed out. Please check the network connection to the database server.'
    });
  }

  if (code === 'ELOGIN' || msg.includes('Login failed')) {
    return res.status(503).json({
      message: 'SQL Server login failed. Please check the database username and password.'
    });
  }

  if (code === 'EREQUEST' && msg.includes('Invalid object name')) {
    const match = msg.match(/Invalid object name '([^']+)'/);
    return res.status(503).json({
      message: `Database table ${match ? match[1] : ''} does not exist. Please run the required database setup scripts.`
    });
  }

  if (code === 'ECONNCLOSED' || msg.includes('Connection is closed') || msg.includes('connection was lost')) {
    return res.status(503).json({
      message: 'The database connection was lost. SQL Server may have restarted. Please try again.'
    });
  }

  if (error.name === 'ConnectionError' || msg.includes('ConnectionError')) {
    return res.status(503).json({
      message: 'Cannot connect to the database server. Please check the network and SQL Server status.'
    });
  }

  if (msg.includes('deadlock') || msg.includes('Deadlock')) {
    return res.status(503).json({
      message: 'A database conflict occurred. Please try again.'
    });
  }

  if (code === 'EREQUEST' && msg.includes('transaction')) {
    return res.status(503).json({
      message: 'A database transaction error occurred. Please try the operation again.'
    });
  }

  // Generic fallback
  res.status(500).json({ message: 'The server could not complete that request.' });
}
