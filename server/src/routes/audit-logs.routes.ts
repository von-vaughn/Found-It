import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/authorize';
import { listAuditLogs } from '../repositories/audit-log.repository';

const router = Router();

/** GET /api/audit-logs — admin only. */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const rawLimit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 500;
  const limit = Number.isFinite(rawLimit) ? rawLimit : 500;
  const logs = await listAuditLogs(limit);
  res.json({ logs, count: logs.length });
});

export default router;
