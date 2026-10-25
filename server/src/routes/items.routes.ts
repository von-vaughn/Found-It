import { Router } from 'express';
import {
  createItemReport,
  getAllItems,
  getBlurredItemImage,
  getItemById,
  removeItemReport,
  updateItemOsaReceipt,
  updateItemReport,
} from '../controllers/items.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/authorize';

const router = Router();

// Public read routes — guests can browse; logged-in users get richer data
router.get('/', optionalAuthenticate, getAllItems);
router.get('/:id/image/blurred', getBlurredItemImage);
router.get('/:id', optionalAuthenticate, getItemById);

// Write routes require authentication
router.post('/', authenticate, createItemReport);
router.patch('/:id', authenticate, updateItemReport); // owner or admin+ (checked in controller)
router.patch('/:id/osa-receipt', authenticate, requireAdmin, updateItemOsaReceipt);
router.delete('/:id', authenticate, removeItemReport); // owner or admin+ (checked in controller)

export default router;
