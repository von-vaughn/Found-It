import { Router } from 'express';
import { pool } from '../config/db';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

/** GET /api/categories — returns all categories with their UUIDs. */
router.get('/', async (_req, res) => {
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM category WHERE is_active = TRUE ORDER BY name`,
  );
  res.json({ categories: rows });
});

/** DELETE /api/categories/:id — admin + super_admin */
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(404).json({ message: 'Category not found.' });
    return;
  }

  const { rows } = await pool.query<{ id: string; name: string }>(
    `UPDATE category
     SET is_active = FALSE
     WHERE id = $1 AND is_active = TRUE
     RETURNING id, name`,
    [id],
  );
  if (!rows[0]) {
    res.status(404).json({ message: 'Category not found.' });
    return;
  }
  res.json({ message: 'Category removed.', category: rows[0] });
});

export default router;
