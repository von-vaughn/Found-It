import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  categoryExists,
  createItem,
  deleteItem,
  findItemById,
  findItemOwner,
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

const itemTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM');

const createItemSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters').max(100),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  itemDate: itemDateSchema,
  itemTime: itemTimeSchema.optional(),
  categoryId: z.string().uuid('categoryId must be a UUID'),
  color: z.string().trim().min(1).max(50).optional(),
  building: z.string().trim().min(1).max(100).optional(),
  location: z.string().trim().min(1).max(500).optional(),
  importantDetails: z.string().trim().min(1).max(2000).optional(),
  image: z.string().trim().min(1).optional(),
  images: z.array(z.string().trim().min(1)).max(10).optional(),
});

const updateItemSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  itemDate: itemDateSchema.optional(),
  itemTime: itemTimeSchema.optional(),
  categoryId: z.string().uuid('categoryId must be a UUID').optional(),
  color: z.string().trim().min(1).max(50).optional(),
  importantDetails: z.string().trim().min(1).max(2000).optional(),
  building: z.string().trim().min(1).max(100).optional(),
  location: z.string().trim().min(1).max(500).optional(),
  image: z.string().trim().min(1).optional(),
  images: z.array(z.string().trim().min(1)).max(10).optional(),
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

/** Admins see reporter email; school users and guests see reporter name only. */
function seesReporterEmail(req: Request): boolean {
  return req.user?.role === 'admin' || req.user?.role === 'super_admin';
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
  if (!(await categoryExists(parsed.data.categoryId))) {
    res.status(400).json({ message: 'Unknown categoryId.' });
    return;
  }
  const data = parsed.data;
  let images = data.images;
  if (!images && data.image) {
    images = [data.image];
  }
  const { id } = await createItem({ reporterId: req.user!.sub, ...data, images });
  const item = await findItemById(id, seesReporterEmail(req), req.user!.sub);
  res.status(201).json({ message: 'Item report submitted.', item });
}

/** GET /api/items — any user or guest (admins see reporter emails). Filters: reportType, categoryId, search, mine */
export async function getAllItems(req: Request, res: Response): Promise<void> {
  const reportType =
    typeof req.query.reportType === 'string' ? (req.query.reportType as ReportType) : undefined;
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const mine = req.query.mine === 'true' && req.user ? req.user.sub : undefined;
  if (reportType && !REPORT_TYPES.includes(reportType)) {
    res.status(400).json({ message: `Invalid reportType. Allowed: ${REPORT_TYPES.join(', ')}` });
    return;
  }
  if (categoryId && !UUID_RE.test(categoryId)) {
    res.status(400).json({ message: 'Invalid categoryId. Must be a UUID.' });
    return;
  }
  const viewerId = req.user?.sub ?? '';
  const items = await listItems(
    { reportType, categoryId, search, reporterId: mine },
    seesReporterEmail(req),
    viewerId,
  );
  res.json({ items, count: items.length });
}

/** GET /api/items/:id — any user or guest */
export async function getItemById(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const viewerId = req.user?.sub ?? '';
  const item = await findItemById(id, seesReporterEmail(req), viewerId);
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
  const owner = await findItemOwner(id);
  if (!owner) {
    res.status(404).json({ message: 'Item not found.' });
    return;
  }
  if (!canManage(req, owner.reporterId)) {
    res.status(403).json({ message: 'You can only edit your own reports.' });
    return;
  }
  if (parsed.data.categoryId && !(await categoryExists(parsed.data.categoryId))) {
    res.status(400).json({ message: 'Unknown categoryId.' });
    return;
  }
  if (parsed.data.building && !parsed.data.location) {
    res.status(400).json({ message: 'location is required when changing building.' });
    return;
  }
  const data = parsed.data;
  let images = data.images;
  if (!images && data.image !== undefined) {
    images = data.image ? [data.image] : [];
  }
  const updated = await updateItem(
    id,
    { ...data, images },
    seesReporterEmail(req),
    req.user!.sub,
  );
  res.json({ message: 'Item report updated.', item: updated });
}

/** DELETE /api/items/:id — owner or admin+ */
export async function removeItemReport(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const owner = await findItemOwner(id);
  if (!owner) {
    res.status(404).json({ message: 'Item not found.' });
    return;
  }
  if (!canManage(req, owner.reporterId)) {
    res.status(403).json({ message: 'You can only delete your own reports.' });
    return;
  }
  await deleteItem(id);
  res.json({ message: 'Item report deleted.' });
}
