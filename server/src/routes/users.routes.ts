import { Router } from 'express';
import {
  changeUserRole,
  changeUserStatus,
  changeUserSuspension,
  createAdminUser,
  getAllUsers,
  getUserById,
  removeUser,
} from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/authorize';

const router = Router();

// All user-management routes require authentication
router.use(authenticate);

// Admin only
router.get('/', requireAdmin, getAllUsers);
router.get('/:id', getUserById); // self or admin (checked in controller)
router.patch('/:id/status', requireAdmin, changeUserStatus);
router.patch('/:id/suspend', requireAdmin, changeUserSuspension);
router.delete('/:id', requireAdmin, removeUser);
router.post('/', requireAdmin, createAdminUser);
router.patch('/:id/role', requireAdmin, changeUserRole);

export default router;
