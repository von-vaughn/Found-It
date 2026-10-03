import { Router } from 'express';
import {
  changePassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Public
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Authenticated
router.get('/me', authenticate, me);
router.post('/logout-all', authenticate, logoutAll);
router.patch('/change-password', authenticate, changePassword);

export default router;
