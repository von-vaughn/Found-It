import { Router } from 'express';
import {
  createItemReport,
  getAllItems,
  getItemById,
  removeItemReport,
  updateItemReport,
} from '../controllers/items.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All item routes require authentication (normal users can submit + browse)
router.use(authenticate);

router.post('/', createItemReport);
router.get('/', getAllItems);
router.get('/:id', getItemById);
router.patch('/:id', updateItemReport); // owner or admin+ (checked in controller)
router.delete('/:id', removeItemReport); // owner or admin+ (checked in controller)

export default router;
