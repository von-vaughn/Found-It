import { Router } from 'express';
import {
  changePassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
  resendOtp,
  verifyEmail,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authLimiter, resendOtpLimiter } from '../middleware/rate-limit';
import { csrfProtection } from '../middleware/csrf';

const router = Router();

// Public (brute-force & CSRF protected)
router.post('/register', authLimiter, register);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-otp', authLimiter, resendOtpLimiter, resendOtp);
router.post('/login', authLimiter, csrfProtection, login);
router.post('/refresh', authLimiter, csrfProtection, refresh);
router.post('/logout', csrfProtection, logout);

// Authenticated
router.get('/me', authenticate, me);
router.post('/logout-all', authenticate, logoutAll);
router.patch('/change-password', authenticate, changePassword);

export default router;
