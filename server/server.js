import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import connectDatabase from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import requireAuth from './middleware/requireAuth.js';
import useAirportDatabase from './middleware/useAirportDatabase.js';
import authRoutes from './routes/authRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import hrEmployeesRoutes from './routes/hrEmployeesRoutes.js';
import printRoutes from './routes/printRoutes.js';
import { ensureUsersSchema } from './controllers/authController.js';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err?.message || err);
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', printRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sales', requireAuth, useAirportDatabase, salesRoutes);
app.use('/api/users', requireAuth, useAirportDatabase, usersRoutes);
app.use('/api/hr/employees', requireAuth, hrEmployeesRoutes);
app.use(errorHandler);

const port = process.env.PORT || 5000;

connectDatabase()
  .then(async airports => {
    const schemaResults = await Promise.allSettled(airports.map(airport => ensureUsersSchema(airport)));
    schemaResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Could not initialize the users schema for airport ${airports[index]}:`, result.reason.message);
      }
    });
  })
  .then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`)))
  .catch(error => {
    console.error('SQL Server connection failed:', error);
    process.exit(1);
  });
