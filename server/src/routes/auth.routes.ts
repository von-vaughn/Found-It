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
import { authLimiter } from '../middleware/rate-limit';

const router = Router();

// Public (brute-force protected)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

// Authenticated
router.get('/me', authenticate, me);
router.post('/logout-all', authenticate, logoutAll);
router.patch('/change-password', authenticate, changePassword);

export default router;
