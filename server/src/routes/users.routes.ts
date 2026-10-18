import { Router } from 'express';
import {
  changeUserRole,
  changeUserStatus,
  getAllUsers,
  getUserById,
  removeUser,
} from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin, requireSuperAdmin } from '../middleware/authorize';

const router = Router();

// All user-management routes require authentication
router.use(authenticate);

// Admin + super_admin
router.get('/', requireAdmin, getAllUsers);
router.get('/:id', getUserById); // self or admin+ (checked in controller)
router.patch('/:id/status', requireAdmin, changeUserStatus);
router.delete('/:id', requireAdmin, removeUser);

// Super_admin only
router.patch('/:id/role', requireSuperAdmin, changeUserRole);

export default router;
