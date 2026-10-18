import { Router } from 'express';
import { pool } from '../config/db';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

/** GET /api/categories — returns all categories with their UUIDs. */
router.get('/', async (_req, res) => {
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM category ORDER BY name`,
  );
  res.json({ categories: rows });
});

export default router;
