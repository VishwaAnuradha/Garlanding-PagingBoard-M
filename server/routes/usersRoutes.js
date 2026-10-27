import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/usersController.js';

const router = Router();

// All user-management routes require admin role
router.get('/',          requireAdmin, asyncHandler(getUsers));
router.post('/',         requireAdmin, asyncHandler(createUser));
router.put('/:userId',   requireAdmin, asyncHandler(updateUser));
router.delete('/:userId',requireAdmin, asyncHandler(deleteUser));

export default router;
