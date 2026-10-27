import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { getHrEmployees } from '../controllers/hrEmployeesController.js';

const router = Router();

router.get('/', requireAdmin, asyncHandler(getHrEmployees));

export default router;
