import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { authenticate } from '../middleware/authenticate';
import { requireStaff } from '../middleware/authorize';
import { recordAuditLog } from '../repositories/audit-log.repository';

const router = Router();
const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(50, 'Category name cannot exceed 50 characters.'),
});

/** GET /api/categories — public active category options. */
router.get('/', async (_req, res) => {
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM category WHERE is_active = TRUE ORDER BY name`,
  );
  res.json({ categories: rows });
});

/** POST /api/categories — staff + admin; creates or reactivates category. */
router.post('/', authenticate, requireStaff, async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid category name.' });
    return;
  }

  const name = parsed.data.name;
  const { rows: existing } = await pool.query<{ id: string; name: string; is_active: boolean }>(
    `SELECT id, name, is_active FROM category WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name],
  );

  if (existing[0]?.is_active) {
    res.status(409).json({ message: 'That category already exists.' });
    return;
  }

  const { rows } = existing[0]
    ? await pool.query<{ id: string; name: string }>(
        `UPDATE category SET is_active = TRUE, name = $2 WHERE id = $1 RETURNING id, name`,
        [existing[0].id, name],
      )
    : await pool.query<{ id: string; name: string }>(
        `INSERT INTO category (name, is_active) VALUES ($1, TRUE) RETURNING id, name`,
        [name],
      );

  const category = rows[0];
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'created',
    entityType: 'category',
    entityId: category.id,
    summary: `Added category "${category.name}"`,
  });

  res.status(existing[0] ? 200 : 201).json({ message: 'Category added.', category });
});

/** DELETE /api/categories/:id — staff + admin */
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
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
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'deleted',
    entityType: 'category',
    entityId: rows[0].id,
    summary: `Removed category "${rows[0].name}"`,
  });
  res.json({ message: 'Category removed.', category: rows[0] });
});

export default router;
