import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createItem,
  deleteItem,
  findItemById,
  listItems,
  updateItem,
} from '../repositories/item.repository';
import { REPORT_TYPES, type ReportType } from '../types/items';

const itemDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid calendar date')
  .refine((s) => new Date(`${s}T00:00:00Z`) <= new Date(), 'Date cannot be in the future');

const createItemSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters').max(100),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  itemDate: itemDateSchema,
  category: z.string().trim().min(2, 'Category must be at least 2 characters').max(50),
});

const updateItemSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  itemDate: itemDateSchema.optional(),
  category: z.string().trim().min(2).max(50).optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

function zodError(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    message: 'Validation failed',
    errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  });
}

function invalidId(res: Response, id: string): boolean {
  if (!UUID_RE.test(id)) {
    res.status(404).json({ message: 'Item not found.' });
    return true;
  }
  return false;
}

function canManage(req: Request, reporterId: string): boolean {
  if (req.user!.sub === reporterId) return true;
  return req.user!.role === 'admin' || req.user!.role === 'super_admin';
}

/** POST /api/items — any authenticated user (lost or found report) */
export async function createItemReport(req: Request, res: Response): Promise<void> {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const item = await createItem({ reporterId: req.user!.sub, ...parsed.data });
  res.status(201).json({ message: 'Item report submitted.', item });
}

/** GET /api/items — any authenticated user. Filters: reportType, category, search, mine */
export async function getAllItems(req: Request, res: Response): Promise<void> {
  const reportType =
    typeof req.query.reportType === 'string' ? (req.query.reportType as ReportType) : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const mine = req.query.mine === 'true' ? req.user!.sub : undefined;
  if (reportType && !REPORT_TYPES.includes(reportType)) {
    res.status(400).json({ message: `Invalid reportType. Allowed: ${REPORT_TYPES.join(', ')}` });
    return;
  }
  const items = await listItems({ reportType, category, search, reporterId: mine });
  res.json({ items, count: items.length });
}

/** GET /api/items/:id — any authenticated user */
export async function getItemById(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const item = await findItemById(id);
  if (!item) {
    res.status(404).json({ message: 'Item not found.' });
    return;
  }
  res.json({ item });
}

/** PATCH /api/items/:id — owner or admin+ (name/description/date/category only) */
export async function updateItemReport(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ message: 'Nothing to update.' });
    return;
  }
  const existing = await findItemById(id);
  if (!existing) {
    res.status(404).json({ message: 'Item not found.' });
    return;
  }
  if (!canManage(req, existing.reporterId)) {
    res.status(403).json({ message: 'You can only edit your own reports.' });
    return;
  }
  const updated = await updateItem(id, parsed.data);
  res.json({ message: 'Item report updated.', item: updated });
}

/** DELETE /api/items/:id — owner or admin+ */
export async function removeItemReport(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const existing = await findItemById(id);
  if (!existing) {
    res.status(404).json({ message: 'Item not found.' });
    return;
  }
  if (!canManage(req, existing.reporterId)) {
    res.status(403).json({ message: 'You can only delete your own reports.' });
    return;
  }
  await deleteItem(id);
  res.json({ message: 'Item report deleted.' });
}
