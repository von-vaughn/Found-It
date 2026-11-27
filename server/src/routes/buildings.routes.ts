import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { authenticate } from '../middleware/authenticate';
import { requireStaff } from '../middleware/authorize';
import { recordAuditLog } from '../repositories/audit-log.repository';

const router = Router();
const createBuildingSchema = z.object({
  name: z.string().trim().min(1, 'Building name is required.').max(100, 'Building name cannot exceed 100 characters.'),
});

/** GET /api/buildings — public active building options. */
router.get('/', async (_req, res) => {
  const { rows } = await pool.query<{ building_id: string; name: string }>(
    `SELECT building_id, name FROM building WHERE is_active = TRUE ORDER BY name`,
  );
  res.json({
    buildings: rows.map(({ building_id, name }) => ({ id: building_id, name })),
  });
});

/** POST /api/buildings — staff + admin; creates or reactivates building. */
router.post('/', authenticate, requireStaff, async (req, res) => {
  const parsed = createBuildingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid building name.' });
    return;
  }

  const name = parsed.data.name;
  const { rows: existing } = await pool.query<{ building_id: string; name: string; is_active: boolean }>(
    `SELECT building_id, name, is_active FROM building WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name],
  );

  if (existing[0]?.is_active) {
    res.status(409).json({ message: 'That building already exists.' });
    return;
  }

  const { rows } = existing[0]
    ? await pool.query<{ building_id: string; name: string }>(
        `UPDATE building SET is_active = TRUE, name = $2 WHERE building_id = $1 RETURNING building_id, name`,
        [existing[0].building_id, name],
      )
    : await pool.query<{ building_id: string; name: string }>(
        `INSERT INTO building (name, is_active) VALUES ($1, TRUE) RETURNING building_id, name`,
        [name],
      );

  const building = { id: rows[0].building_id, name: rows[0].name };
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'created',
    entityType: 'building',
    entityId: building.id,
    summary: `Added building "${building.name}"`,
  });

  res.status(existing[0] ? 200 : 201).json({ message: 'Building added.', building });
});

/** DELETE /api/buildings/:id — staff + admin; archived to preserve report history. */
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
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
  const building = { id: rows[0].building_id, name: rows[0].name };
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'deleted',
    entityType: 'building',
    entityId: building.id,
    summary: `Removed building "${building.name}"`,
  });
  res.json({
    message: 'Building removed.',
    building,
  });
});

export default router;
