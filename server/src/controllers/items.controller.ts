import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  CannotRevokeOsaReceiptError,
  categoryExists,
  createItem,
  deleteItem,
  findItemById,
  findItemImageForBlur,
  findItemOwner,
  listItems,
  saveBlurredImageUrl,
  updateItem,
  updateOsaReceipt,
} from '../repositories/item.repository';
import { recordAuditLog } from '../repositories/audit-log.repository';
import { REPORT_TYPES, type ReportType } from '../types/items';
import { fetchRemoteImageBuffer, generateBlurredImage } from '../utils/image-blur';
import { isDriveConfigured, uploadFileToDrive } from '../utils/google-drive';
import { pastOrTodayDateSchema } from '../validation/dates';

const itemDateSchema = pastOrTodayDateSchema;

const itemTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM');

const ALLOWED_IMAGE_HOSTS = new Set([
  'lh3.googleusercontent.com',
  'drive.google.com',
  'drive.usercontent.google.com',
]);

export function isTrustedImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/api/') && !trimmed.startsWith('//')) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

const imageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isTrustedImageUrl, 'Image URL must come from approved storage.');

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
  image: imageUrlSchema.optional(),
  images: z.array(imageUrlSchema).max(10).optional(),
  blurredImage: imageUrlSchema.optional(),
  blurredImages: z.array(imageUrlSchema).max(10).optional(),
});

const updateItemSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  itemDate: itemDateSchema.optional(),
  itemTime: z.union([itemTimeSchema, z.literal(''), z.null()]).optional(),
  categoryId: z.string().uuid('categoryId must be a UUID').optional(),
  color: z.union([z.string().trim().max(50), z.null()]).optional(),
  importantDetails: z.union([z.string().trim().max(2000), z.null()]).optional(),
  building: z.union([z.string().trim().max(100), z.null()]).optional(),
  location: z.union([z.string().trim().max(500), z.null()]).optional(),
  image: imageUrlSchema.optional(),
  images: z.array(imageUrlSchema).max(10).optional(),
  blurredImage: imageUrlSchema.optional(),
  blurredImages: z.array(imageUrlSchema).max(10).optional(),
});

const updateOsaReceiptSchema = z.object({
  receivedByOsa: z.boolean(),
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

/** Admins see reporter email and unblurred found-item images. */
function isAdminUser(req: Request): boolean {
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
  let blurredImages = data.blurredImages;
  if (!blurredImages && data.blurredImage) {
    blurredImages = [data.blurredImage];
  }
  const { id } = await createItem({ reporterId: req.user!.sub, ...data, images, blurredImages });
  const item = await findItemById(id, isAdminUser(req), req.user!.sub);
  res.status(201).json({ message: 'Item report submitted.', item });
}

/** GET /api/items — any user or guest (admins see reporter emails and unblurred found photos). Filters: reportType, categoryId, search, mine */
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
    isAdminUser(req),
    viewerId,
  );
  res.json({ items, count: items.length });
}

/** GET /api/items/:id — any user or guest */
export async function getItemById(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const viewerId = req.user?.sub ?? '';
  const item = await findItemById(id, isAdminUser(req), viewerId);
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
  if (owner.hasResolvedRequest) {
    res.status(409).json({
      message: 'Cannot edit a report with an approved, claimed, or returned request.',
    });
    return;
  }
  if (parsed.data.categoryId && !(await categoryExists(parsed.data.categoryId))) {
    res.status(400).json({ message: 'Unknown categoryId.' });
    return;
  }
  const data = parsed.data;
  let images = data.images;
  if (!images && data.image !== undefined) {
    images = data.image ? [data.image] : [];
  }
  let blurredImages = data.blurredImages;
  if (!blurredImages && data.blurredImage !== undefined) {
    blurredImages = data.blurredImage ? [data.blurredImage] : [];
  }
  const updated = await updateItem(
    id,
    { ...data, images, blurredImages },
    isAdminUser(req),
    req.user!.sub,
  );
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'updated',
    entityType: 'item',
    entityId: id,
    summary: `Updated item report "${updated?.name ?? owner.name}"`,
  });
  res.json({ message: 'Item report updated.', item: updated });
}

/** PATCH /api/items/:id/osa-receipt — admin-only found-item custody update. */
export async function updateItemOsaReceipt(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const parsed = updateOsaReceiptSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  let updated;
  try {
    updated = await updateOsaReceipt(id, parsed.data.receivedByOsa, req.user!.sub);
  } catch (err) {
    if (err instanceof CannotRevokeOsaReceiptError) {
      res.status(409).json({ message: err.message });
      return;
    }
    throw err;
  }
  if (!updated) {
    res.status(404).json({ message: 'Found item report not found.' });
    return;
  }
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'updated',
    entityType: 'item',
    entityId: id,
    summary: `Marked "${updated.name}" as ${parsed.data.receivedByOsa ? 'received by OSA' : 'awaiting OSA'}`,
  });
  res.json({ message: 'OSA receipt status updated.', item: updated });
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
  if (owner.hasResolvedRequest) {
    res.status(409).json({
      message: 'Cannot delete a report with an approved, claimed, or returned request.',
    });
    return;
  }
  await deleteItem(id);
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'deleted',
    entityType: 'item',
    entityId: id,
    summary: `Deleted item report "${owner.name}"`,
  });
  res.json({ message: 'Item report deleted.' });
}

/**
 * GET /api/items/:id/image/blurred — Dynamic streaming fallback.
 * Generates and streams genuinely blurred image bytes directly if a found item
 * did not have a pre-stored blurred URL.
 */
export async function getBlurredItemImage(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;

  const rawIndex = typeof req.query.index === 'string' ? Number.parseInt(req.query.index, 10) : 0;
  const imageIndex = Number.isFinite(rawIndex) && rawIndex >= 0 ? rawIndex : 0;

  const imgData = await findItemImageForBlur(id, imageIndex);
  if (!imgData || !imgData.imageUrl || imgData.reportType !== 'found') {
    res.status(404).json({ message: 'Image not found.' });
    return;
  }

  // Only redirect to vetted Drive HTTPS URLs (prevents open redirects)
  if (
    imgData.blurredImageUrl &&
    imgData.blurredImageUrl.startsWith('https://') &&
    isTrustedImageUrl(imgData.blurredImageUrl)
  ) {
    res.redirect(imgData.blurredImageUrl);
    return;
  }

  if (!imgData.imageUrl.startsWith('https://') || !isTrustedImageUrl(imgData.imageUrl)) {
    res.status(400).json({ message: 'Untrusted source image URL.' });
    return;
  }

  try {
    const remoteBuffer = await fetchRemoteImageBuffer(imgData.imageUrl);
    const blurredBuffer = await generateBlurredImage(remoteBuffer);

    // Asynchronously save to Drive for future requests
    if (isDriveConfigured()) {
      uploadFileToDrive({
        name: `blurred-${Date.now()}-${id}.jpg`,
        mimeType: 'image/jpeg',
        content: blurredBuffer,
      })
        .then((uploaded) => saveBlurredImageUrl(imgData.id, uploaded.directUrl))
        .catch((err) => console.warn('[Blur Fallback] Failed to save to Drive:', err));
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.send(blurredBuffer);
  } catch (err) {
    console.error('[Blur Fallback] Error generating blurred image:', err);
    res.status(500).json({ message: 'Failed to process blurred image.' });
  }
}
