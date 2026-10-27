import { Router } from 'express';
import { closeTodaySales, createSale, getTodaySales, reopenTodaySales, getSalesHistory, getSalesReport, voidTicket, getErrorTickets } from '../controllers/salesController.js';
import { getDashboard, getSettings, updateSettings, getSessionIncome } from '../controllers/adminController.js';

import asyncHandler from '../middleware/asyncHandler.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { createShift, getShifts, updateShiftStatus } from '../controllers/shiftController.js';

const router = Router();
router.get('/today', asyncHandler(getTodaySales));
router.post('/', asyncHandler(createSale));
router.post('/close', asyncHandler(closeTodaySales));
router.post('/reopen', asyncHandler(reopenTodaySales));
router.post('/void', asyncHandler(voidTicket));
router.get('/error-tickets', requireAdmin, asyncHandler(getErrorTickets));
router.get('/history', requireAdmin, asyncHandler(getSalesHistory));
router.get('/report', requireAdmin, asyncHandler(getSalesReport));
router.get('/dashboard', requireAdmin, asyncHandler(getDashboard));
router.get('/settings', requireAdmin, asyncHandler(getSettings));
router.put('/settings', requireAdmin, asyncHandler(updateSettings));
router.get('/session-income', requireAdmin, asyncHandler(getSessionIncome));

router.get('/shifts', requireAdmin, asyncHandler(getShifts));
router.post('/shifts', requireAdmin, asyncHandler(createShift));
router.patch('/shifts/:id/status', requireAdmin, asyncHandler(updateShiftStatus));

export default router;
