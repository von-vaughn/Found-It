import { Router } from 'express';
import {
  checkEmail,
  forgotPassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
  resendOtp,
  resetPassword,
  verifyAdminPassword,
  verifyEmail,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/authorize';
import { apiLimiter, authLimiter, resendOtpLimiter } from '../middleware/rate-limit';
import { csrfProtection } from '../middleware/csrf';

const router = Router();

// Public (brute-force & CSRF protected)
router.post('/check-email', apiLimiter, checkEmail);
router.get('/check-email', apiLimiter, checkEmail);
router.post('/register', authLimiter, register);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-otp', authLimiter, resendOtpLimiter, resendOtp);
router.post('/forgot-password', authLimiter, resendOtpLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/login', authLimiter, csrfProtection, login);
router.post('/refresh', authLimiter, csrfProtection, refresh);
router.post('/logout', csrfProtection, logout);

// Authenticated
router.get('/me', authenticate, me);
router.post('/logout-all', authenticate, logoutAll);
router.post('/verify-password', authenticate, requireAdmin, verifyAdminPassword);

export default router;
