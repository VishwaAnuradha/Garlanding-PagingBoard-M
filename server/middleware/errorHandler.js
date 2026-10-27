export function errorHandler(error, req, res, _next) { console.error(`${req.method} ${req.originalUrl}`, error); res.status(500).json({ message: 'The server could not complete that request.' }); }
