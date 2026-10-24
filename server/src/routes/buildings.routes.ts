import { Router } from 'express';
import { pool } from '../config/db';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

/** GET /api/buildings — returns active building options. */
router.get('/', async (_req, res) => {
  const { rows } = await pool.query<{ building_id: string; name: string }>(
    `SELECT building_id, name FROM building WHERE is_active = TRUE ORDER BY name`,
  );
  res.json({
    buildings: rows.map(({ building_id, name }) => ({ id: building_id, name })),
  });
});

/** DELETE /api/buildings/:id — admin + super_admin; archived to preserve report history. */
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(404).json({ message: 'Building not found.' });
    return;
  }

  const { rows } = await pool.query<{ building_id: string; name: string }>(
    `UPDATE building
     SET is_active = FALSE
     WHERE building_id = $1 AND is_active = TRUE
     RETURNING building_id, name`,
    [id],
  );
  if (!rows[0]) {
    res.status(404).json({ message: 'Building not found.' });
    return;
  }
  res.json({
    message: 'Building removed.',
    building: { id: rows[0].building_id, name: rows[0].name },
  });
});

export default router;
