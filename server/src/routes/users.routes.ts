import { Router } from 'express';
import {
  changeUserRole,
  changeUserStatus,
  createAdminUser,
  getAllUsers,
  getUserById,
  removeUser,
} from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';
import { requireSuperAdmin } from '../middleware/authorize';

const router = Router();

// All user-management routes require authentication
router.use(authenticate);

// Super_admin only
router.get('/', requireSuperAdmin, getAllUsers);
router.get('/:id', getUserById); // self or super_admin (checked in controller)
router.patch('/:id/status', requireSuperAdmin, changeUserStatus);
router.delete('/:id', requireSuperAdmin, removeUser);
router.post('/', requireSuperAdmin, createAdminUser);
router.patch('/:id/role', requireSuperAdmin, changeUserRole);

export default router;
