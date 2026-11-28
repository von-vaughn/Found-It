import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import {
  changeUserRole,
  changeUserStatus,
  changeUserSuspension,
  createAdminUser,
  getAllUsers,
  getUserById,
  removeUser,
  syncSchoolIdsCsv,
} from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/authorize';

const router = Router();

const ALLOWED_CSV_MIMES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
]);

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const extOk = file.originalname.toLowerCase().endsWith('.csv');
    const mimeOk = ALLOWED_CSV_MIMES.has(file.mimetype.toLowerCase());
    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed.'));
    }
  },
});

function handleCsvUpload(req: Request, res: Response, next: NextFunction): void {
  csvUpload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    const message =
      err instanceof multer.MulterError
        ? err.code === 'LIMIT_FILE_SIZE'
          ? 'CSV file is too large (max 5MB).'
          : err.message
        : err instanceof Error
          ? err.message
          : 'Invalid CSV upload.';
    res.status(400).json({ message });
  });
}

// All user-management routes require authentication
router.use(authenticate);

// Admin only
router.get('/', requireAdmin, getAllUsers);
router.post('/sync-school-ids', requireAdmin, handleCsvUpload, syncSchoolIdsCsv);
router.get('/:id', getUserById); // self or admin (checked in controller)
router.patch('/:id/status', requireAdmin, changeUserStatus);
router.patch('/:id/suspend', requireAdmin, changeUserSuspension);
router.delete('/:id', requireAdmin, removeUser);
router.post('/', requireAdmin, createAdminUser);
router.patch('/:id/role', requireAdmin, changeUserRole);

export default router;
