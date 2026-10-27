import { connectAirportDatabase, runWithAirportDatabase } from '../config/db.js';

export default function useAirportDatabase(req, res, next) {
  const airport = req.user?.airport;
  if (!airport) {
    return res.status(400).json({ message: 'Your session has no airport selected. Please sign in again.' });
  }

  try {
    runWithAirportDatabase(airport, async () => {
      try {
        await connectAirportDatabase(airport);
        next();
      } catch (error) {
        console.error(`Airport database connection failed for ${airport}:`, error.message);
        res.status(503).json({
          message: `The ${airport} airport database is unavailable. Check its SQL Server login and database access, then try again.`
        });
      }
    });
  } catch (error) {
    return res.status(403).json({ message: 'Your session contains an invalid airport. Please sign in again.' });
  }
}
