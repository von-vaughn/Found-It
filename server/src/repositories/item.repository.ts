import type { PoolClient } from 'pg';
import { pool } from '../config/db';
import type { Item, ItemFlag, ReportType } from '../types/items';
import { createFinderSurrenderReminderNotification } from './notification.repository';

interface ItemRow {
  id: string;
  reporter_id: string;
  report_type: ReportType;
  is_claimed: boolean;
  is_returned: boolean;
  return_response_count: number;
  has_approved_return: boolean;
  received_by_osa: boolean;
  last_finder_reminder_at: Date | string | null;
  name: string;
  description: string;
  item_date: Date | string;
  item_time: string | null;
  color: string | null;
  building: string | null;
  location: string | null;
  important_details: string | null;
  category_id: string;
  category_name: string;
  custom_category: string | null;
  reporter_name: string;
  reporter_email: string;
  reporter_school_id: string | null;
  resolved_by: {
    id: string | null;
    name: string;
    email: string | null;
    schoolId: string | null;
    isWalkIn: boolean;
  } | null;
  released_by: {
    id: string;
    name: string;
    email: string;
    role: 'staff' | 'admin';
    releasedAt: string | null;
  } | null;
  images: Array<{ url: string; blurred_url: string | null }> | null;
  flags: ItemFlag[] | null;
  flag_reporter_ids: string[] | null;
  created_at: Date;
  updated_at: Date;
}

/** Format a DATE column as YYYY-MM-DD without UTC shifting (pg returns local-midnight Dates). */
function toDateOnly(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// report is the parent of item: who reported, where, when.
const ITEM_COLUMNS = `
  i.id, r.user_id AS reporter_id, r.report_type,
  i.received_by_osa, i.last_finder_reminder_at,
  EXISTS (
    SELECT 1 FROM request claim_request
    WHERE claim_request.item_id = i.id
      AND claim_request.kind = 'claim'
      AND claim_request.status IN ('claimed', 'returned')
  ) AS is_claimed,
  EXISTS (
    SELECT 1 FROM request completed_request
    WHERE completed_request.item_id = i.id
      AND (
        (completed_request.kind = 'claim'
          AND completed_request.status IN ('claimed', 'returned'))
        OR (completed_request.kind = 'return'
          AND completed_request.status = 'returned')
      )
  ) AS is_returned,
  (
    SELECT COUNT(*)::int FROM request rr
    WHERE rr.item_id = i.id
      AND rr.kind = 'return'
      AND rr.status IN ('pending', 'approved', 'returned')
  ) AS return_response_count,
  EXISTS (
    SELECT 1 FROM request rr
    WHERE rr.item_id = i.id
      AND rr.kind = 'return'
      AND rr.status = 'approved'
  ) AS has_approved_return,
  i.name, i.description, r.date AS item_date,
  r.time AS item_time, i.primary_color AS color,
  r.important_details,
  loc.description AS location, b.name AS building,
  c.id AS category_id, c.name AS category_name, i.custom_category,
  u.first_name || ' ' || u.last_name AS reporter_name, u.email AS reporter_email, u.school_id AS reporter_school_id,
  (
    SELECT json_build_object(
      'id', ru.id,
      'name', COALESCE(ru.first_name || ' ' || ru.last_name, completed_request.walkin_name, 'Walk-in claimant'),
      'email', COALESCE(ru.email, completed_request.walkin_contact),
      'schoolId', COALESCE(ru.school_id, completed_request.walkin_school_id),
      'isWalkIn', completed_request.is_walkin
    )
    FROM request completed_request
    LEFT JOIN "user" ru ON ru.id = completed_request.user_id
    WHERE completed_request.item_id = i.id
      AND (
        (completed_request.kind = 'claim'
          AND completed_request.status IN ('claimed', 'returned'))
        OR (completed_request.kind = 'return'
          AND completed_request.status = 'returned')
      )
    ORDER BY completed_request.created_at DESC
    LIMIT 1
  ) AS resolved_by,
  (
    SELECT json_build_object(
      'id', rb.id,
      'name', rb.first_name || ' ' || rb.last_name,
      'email', rb.email,
      'role', rb.role,
      'releasedAt', CASE
        WHEN completed_request.released_at IS NOT NULL
        THEN to_char(completed_request.released_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        ELSE NULL
      END
    )
    FROM request completed_request
    JOIN "user" rb ON rb.id = completed_request.released_by
    WHERE completed_request.item_id = i.id
      AND (
        (completed_request.kind = 'claim'
          AND completed_request.status IN ('claimed', 'returned'))
        OR (completed_request.kind = 'return'
          AND completed_request.status = 'returned')
      )
    ORDER BY completed_request.released_at DESC NULLS LAST, completed_request.created_at DESC
    LIMIT 1
  ) AS released_by,
  COALESCE(
    (SELECT json_agg(
      json_build_object('url', img.image_url, 'blurred_url', img.blurred_image_url)
      ORDER BY img.created_at ASC
    ) FROM image img WHERE img.item_id = i.id),
    '[]'::json
  ) AS images,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', f.id,
        'reporterId', f.reporter_id,
        'reporterName', fu.first_name || ' ' || fu.last_name,
        'reporterEmail', fu.email,
        'reason', f.reason,
        'createdAt', to_char(f.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) ORDER BY f.created_at DESC
    )
    FROM item_flag f
    JOIN "user" fu ON fu.id = f.reporter_id
    WHERE f.item_id = i.id AND f.dismissed_at IS NULL),
    '[]'::json
  ) AS flags,
  COALESCE(
    (SELECT array_agg(DISTINCT f_all.reporter_id::text)
     FROM item_flag f_all
     WHERE f_all.item_id = i.id),
    ARRAY[]::text[]
  ) AS flag_reporter_ids,
  i.created_at, i.updated_at
`;
const ITEM_JOIN = `
  FROM item i
  JOIN report r ON r.id = i.report_id
  LEFT JOIN location loc ON loc.id = r.location_id
  LEFT JOIN building b ON b.building_id = loc.building_id
  JOIN category c ON c.id = i.category_id
  JOIN "user" u ON u.id = r.user_id
`;

/**
 * Builds the public Item shape.
 * - Reporter email is gated to OSA staff/admins ('staff', 'admin') only.
 * - importantDetails is gated to the report owner or admin+.
 * - For found items: admins see the original unblurred image; school users and
 *   public guests only receive the server-blurred image variant.
 * - For lost items: all users see the original unblurred image.
 */
function toItem(row: ItemRow, isAdmin: boolean, viewerId: string): Item {
  const canSeeMarker = isAdmin || row.reporter_id === viewerId;
  const rawImages: Array<{ url: string; blurred_url: string | null }> = Array.isArray(row.images)
    ? row.images
    : [];

  let imageList: string[];
  if (row.report_type === 'found') {
    if (isAdmin) {
      // Admins see original, unblurred photos
      imageList = rawImages.map((img) => img.url);
    } else {
      // School users and public users receive server-blurred images only
      imageList = rawImages.map(
        (img, index) => img.blurred_url || `/api/items/${row.id}/image/blurred?index=${index}`,
      );
    }
  } else {
    // Lost items are never blurred
    imageList = rawImages.map((img) => img.url);
  }

  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportType: row.report_type,
    isClaimed: row.is_claimed,
    isReturned: row.is_returned,
    ...(isAdmin
      ? {
          receivedByOsa: row.received_by_osa,
          lastFinderReminderAt: row.last_finder_reminder_at
            ? new Date(row.last_finder_reminder_at).toISOString()
            : null,
        }
      : {}),
    name: row.name,
    description: row.description,
    itemDate: toDateOnly(row.item_date),
    itemTime: row.item_time ? row.item_time.slice(0, 5) : null,
    categoryId: row.category_id,
    category: row.category_name,
    customCategory: row.custom_category,
    color: row.color,
    building: row.building,
    location: row.location,
    image: imageList[0] ?? null,
    images: imageList,
    ...(canSeeMarker && row.important_details
      ? { importantDetails: row.important_details }
      : {}),
    ...(canSeeMarker && row.report_type === 'lost'
      ? {
          returnResponseCount: Number(row.return_response_count) || 0,
          hasApprovedReturn: Boolean(row.has_approved_return),
        }
      : {}),
    user: isAdmin
      ? {
          id: row.reporter_id,
          name: row.reporter_name,
          email: row.reporter_email,
          ...(row.reporter_school_id ? { schoolId: row.reporter_school_id } : {}),
        }
      : { id: row.reporter_id, name: row.reporter_name },
    ...(isAdmin
      ? {
          resolvedBy: row.resolved_by
            ? {
                ...(row.resolved_by.id ? { id: row.resolved_by.id } : {}),
                name: row.resolved_by.name,
                ...(row.resolved_by.email ? { email: row.resolved_by.email } : {}),
                ...(row.resolved_by.schoolId
                  ? { schoolId: row.resolved_by.schoolId }
                  : {}),
                ...(row.resolved_by.isWalkIn ? { isWalkIn: true } : {}),
              }
            : null,
          releasedBy: row.released_by
            ? {
                id: row.released_by.id,
                name: row.released_by.name,
                email: row.released_by.email,
                role: row.released_by.role,
              }
            : null,
          releasedAt: row.released_by?.releasedAt ?? null,
          flagCount: Array.isArray(row.flags) ? row.flags.length : 0,
          flags: Array.isArray(row.flags) ? row.flags : [],
        }
      : {}),
    ...(viewerId
      ? {
          hasReported:
            Array.isArray(row.flag_reporter_ids) &&
            row.flag_reporter_ids.includes(viewerId),
        }
      : {}),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Fetches the active category metadata for validation and "other" category checks. */
export async function findActiveCategoryById(
  id: string,
): Promise<{ id: string; name: string } | null> {
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM category WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function categoryExists(id: string): Promise<boolean> {
  return (await findActiveCategoryById(id)) !== null;
}

/** Find-or-create a building by name (case-insensitive). */
async function upsertBuilding(client: PoolClient, name: string): Promise<string> {
  const { rows } = await client.query<{ building_id: string }>(
    `SELECT building_id FROM building WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name],
  );
  if (rows[0]) return rows[0].building_id;
  const { rows: inserted } = await client.query<{ building_id: string }>(
    `INSERT INTO building (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING building_id`,
    [name],
  );
  return inserted[0].building_id;
}

/** Find-or-create a location description, optionally within a building. */
async function upsertLocation(
  client: PoolClient,
  buildingId: string | null,
  description: string,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM location
     WHERE LOWER(description) = LOWER($1) AND building_id IS NOT DISTINCT FROM $2
     LIMIT 1`,
    [description, buildingId],
  );
  if (rows[0]) return rows[0].id;
  const { rows: inserted } = await client.query<{ id: string }>(
    `INSERT INTO location (building_id, description) VALUES ($1, $2) RETURNING id`,
    [buildingId, description],
  );
  return inserted[0].id;
}

export interface CreateItemInput {
  reporterId: string;
  reportType: ReportType;
  name: string;
  description: string;
  itemDate: string;
  itemTime?: string;
  categoryId: string;
  customCategory?: string | null;
  color?: string;
  building?: string;
  location?: string;
  importantDetails?: string;
  images?: string[];
  blurredImages?: string[];
  receivedByOsa?: boolean;
}

/** Creates the parent report row and its item (plus any location) in one transaction. */
export async function createItemWithClient(
  client: PoolClient,
  input: CreateItemInput,
): Promise<{ id: string }> {
  const buildingId = input.building ? await upsertBuilding(client, input.building) : null;
  const locationId =
    input.location !== undefined || buildingId !== null
      ? await upsertLocation(client, buildingId, input.location ?? '')
      : null;
  const { rows: reportRows } = await client.query<{ id: string }>(
    `INSERT INTO report (user_id, report_type, date, time, important_details, location_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      input.reporterId,
      input.reportType,
      input.itemDate,
      input.itemTime ?? null,
      input.importantDetails ?? null,
      locationId,
    ],
  );
  const { rows: itemRows } = await client.query<{ id: string }>(
    `INSERT INTO item (report_id, category_id, custom_category, name, description, primary_color, received_by_osa)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      reportRows[0].id,
      input.categoryId,
      input.customCategory ?? null,
      input.name,
      input.description,
      input.color ?? null,
      Boolean(input.receivedByOsa),
    ],
  );
  const itemId = itemRows[0].id;
  if (input.images && input.images.length > 0) {
    for (let i = 0; i < input.images.length; i++) {
      const imgUrl = input.images[i];
      const blurredUrl = input.blurredImages?.[i] || null;
      if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
        await client.query(
          `INSERT INTO image (item_id, image_url, blurred_image_url) VALUES ($1, $2, $3)`,
          [itemId, imgUrl.trim(), blurredUrl ? blurredUrl.trim() : null],
        );
      }
    }
  }
  return { id: itemId };
}

export async function createItem(input: CreateItemInput): Promise<{ id: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await createItemWithClient(client, input);
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findItemById(
  id: string,
  isAdmin: boolean,
  viewerId: string,
): Promise<Item | null> {
  const { rows } = await pool.query<ItemRow>(
    `SELECT ${ITEM_COLUMNS} ${ITEM_JOIN} WHERE i.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? toItem(rows[0], isAdmin, viewerId) : null;
}

export async function listItemsPage(
  filter: {
    reportType?: ReportType;
    categoryId?: string;
    search?: string;
    reporterId?: string;
  },
  isAdmin: boolean,
  viewerId: string,
  pagination: { limit: number; offset: number } = { limit: 200, offset: 0 },
): Promise<{ items: Item[]; hasMore: boolean }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter?.reportType) {
    params.push(filter.reportType);
    conditions.push(`r.report_type = $${params.length}`);
  }
  if (filter?.categoryId) {
    params.push(filter.categoryId);
    conditions.push(`i.category_id = $${params.length}`);
  }
  if (filter?.reporterId) {
    params.push(filter.reporterId);
    conditions.push(`r.user_id = $${params.length}`);
  }
  if (filter?.search) {
    params.push(`%${filter.search.toLowerCase()}%`);
    conditions.push(
      `(LOWER(i.name) LIKE $${params.length} OR LOWER(i.description) LIKE $${params.length} OR LOWER(COALESCE(i.custom_category, '')) LIKE $${params.length})`,
    );
  }
  if (!isAdmin && !filter?.reporterId) {
    conditions.push(`NOT EXISTS (
      SELECT 1 FROM request resolved_request
      WHERE resolved_request.item_id = i.id
        AND (
          (resolved_request.kind = 'claim'
            AND resolved_request.status IN ('claimed', 'returned'))
          OR (resolved_request.kind = 'return'
            AND resolved_request.status = 'returned')
        )
    )`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(pagination.limit + 1);
  const limitParam = `$${params.length}`;
  params.push(pagination.offset);
  const offsetParam = `$${params.length}`;
  const { rows } = await pool.query<ItemRow>(
    `SELECT ${ITEM_COLUMNS} ${ITEM_JOIN} ${where} ORDER BY i.created_at DESC, i.id DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params,
  );
  const hasMore = rows.length > pagination.limit;
  const pageRows = hasMore ? rows.slice(0, pagination.limit) : rows;
  return {
    items: pageRows.map((row) => toItem(row, isAdmin, viewerId)),
    hasMore,
  };
}

export async function listItems(
  filter: {
    reportType?: ReportType;
    categoryId?: string;
    search?: string;
    reporterId?: string;
  },
  isAdmin: boolean,
  viewerId: string,
): Promise<Item[]> {
  const { items } = await listItemsPage(filter, isAdmin, viewerId);
  return items;
}

/** Returns reporterId, item name, and request-state flags for ownership & guard checks. */
export async function findItemOwner(
  id: string,
): Promise<{
  reporterId: string;
  name: string;
  categoryName: string;
  customCategory: string | null;
  hasResolvedRequest: boolean;
  hasPendingRequest: boolean;
} | null> {
  const { rows } = await pool.query<{
    reporter_id: string;
    name: string;
    category_name: string;
    custom_category: string | null;
    has_resolved_request: boolean;
    has_pending_request: boolean;
  }>(
    `SELECT r.user_id AS reporter_id, i.name,
       c.name AS category_name, i.custom_category,
       EXISTS (
         SELECT 1 FROM request resolved_request
         WHERE resolved_request.item_id = i.id
           AND resolved_request.status IN ('approved', 'claimed', 'returned')
       ) AS has_resolved_request,
       EXISTS (
         SELECT 1 FROM request pending_request
         WHERE pending_request.item_id = i.id
           AND pending_request.status = 'pending'
       ) AS has_pending_request
     FROM item i
     JOIN report r ON r.id = i.report_id
     JOIN category c ON c.id = i.category_id
     WHERE i.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0]
    ? {
        reporterId: rows[0].reporter_id,
        name: rows[0].name,
        categoryName: rows[0].category_name,
        customCategory: rows[0].custom_category,
        hasResolvedRequest: rows[0].has_resolved_request,
        hasPendingRequest: rows[0].has_pending_request,
      }
    : null;
}

export const FINDER_REMINDER_COOLDOWN_MS = 3 * 60 * 60 * 1000;

export type SendFinderReminderResult =
  | { status: 'not_found' }
  | { status: 'already_received' }
  | { status: 'no_pending_claims' }
  | { status: 'not_school_finder' }
  | { status: 'cooldown'; nextAllowedAt: string }
  | { status: 'sent'; itemName: string; lastFinderReminderAt: string };

/**
 * Sends a manual OSA surrender reminder to a student finder holding a claimed
 * Found item, enforcing a 3-hour cooldown per item.
 */
export async function sendFinderReminder(
  itemId: string,
): Promise<SendFinderReminderResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{
      id: string;
      name: string;
      report_type: ReportType;
      received_by_osa: boolean;
      last_finder_reminder_at: Date | string | null;
      finder_id: string;
      finder_role: string;
      finder_active: boolean;
      finder_verified: boolean;
      has_pending_claim: boolean;
    }>(
      `SELECT i.id, i.name, r.report_type, i.received_by_osa, i.last_finder_reminder_at,
              u.id AS finder_id, u.role AS finder_role,
              u.is_active AS finder_active, u.is_verified AS finder_verified,
              EXISTS (
                SELECT 1 FROM request rq
                WHERE rq.item_id = i.id AND rq.kind = 'claim' AND rq.status = 'pending'
              ) AS has_pending_claim
       FROM item i
       JOIN report r ON r.id = i.report_id
       JOIN "user" u ON u.id = r.user_id
       WHERE i.id = $1
       FOR UPDATE OF i`,
      [itemId],
    );
    const row = rows[0];
    if (!row || row.report_type !== 'found') {
      await client.query('ROLLBACK');
      return { status: 'not_found' };
    }
    if (row.received_by_osa) {
      await client.query('ROLLBACK');
      return { status: 'already_received' };
    }
    if (!row.has_pending_claim) {
      await client.query('ROLLBACK');
      return { status: 'no_pending_claims' };
    }
    if (row.finder_role !== 'school_user' || !row.finder_active || !row.finder_verified) {
      await client.query('ROLLBACK');
      return { status: 'not_school_finder' };
    }
    if (row.last_finder_reminder_at) {
      const lastSentMs = new Date(row.last_finder_reminder_at).getTime();
      const nextAllowedMs = lastSentMs + FINDER_REMINDER_COOLDOWN_MS;
      if (!Number.isNaN(lastSentMs) && nextAllowedMs > Date.now()) {
        await client.query('ROLLBACK');
        return {
          status: 'cooldown',
          nextAllowedAt: new Date(nextAllowedMs).toISOString(),
        };
      }
    }

    const { rows: updatedRows } = await client.query<{
      last_finder_reminder_at: Date | string;
    }>(
      `UPDATE item
       SET last_finder_reminder_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING last_finder_reminder_at`,
      [itemId],
    );
    await createFinderSurrenderReminderNotification(client, {
      itemId: row.id,
      itemName: row.name,
      finderId: row.finder_id,
    });
    await client.query('COMMIT');
    return {
      status: 'sent',
      itemName: row.name,
      lastFinderReminderAt: new Date(
        updatedRows[0].last_finder_reminder_at,
      ).toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export class CannotRevokeOsaReceiptError extends Error {
  constructor() {
    super('Cannot undo OSA receipt after a request on this item has already been approved or completed.');
    this.name = 'CannotRevokeOsaReceiptError';
  }
}

export async function updateItem(
  id: string,
  updates: {
    name?: string;
    description?: string;
    itemDate?: string;
    itemTime?: string | null;
    categoryId?: string;
    customCategory?: string | null;
    color?: string | null;
    importantDetails?: string | null;
    building?: string | null;
    location?: string | null;
    images?: string[];
    blurredImages?: string[];
  },
  isAdmin: boolean,
  viewerId: string,
): Promise<Item | null> {
  const itemFields: string[] = [];
  const itemValues: unknown[] = [];
  if (updates.name !== undefined) {
    itemValues.push(updates.name);
    itemFields.push(`name = $${itemValues.length + 1}`);
  }
  if (updates.description !== undefined) {
    itemValues.push(updates.description);
    itemFields.push(`description = $${itemValues.length + 1}`);
  }
  if (updates.categoryId !== undefined) {
    itemValues.push(updates.categoryId);
    itemFields.push(`category_id = $${itemValues.length + 1}`);
  }
  if (updates.customCategory !== undefined) {
    itemValues.push(updates.customCategory || null);
    itemFields.push(`custom_category = $${itemValues.length + 1}`);
  }
  if (updates.color !== undefined) {
    itemValues.push(updates.color || null);
    itemFields.push(`primary_color = $${itemValues.length + 1}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (itemFields.length > 0) {
      await client.query(
        `UPDATE item SET ${itemFields.join(', ')}, updated_at = NOW() WHERE id = $1`,
        [id, ...itemValues],
      );
    }
    const reportFields: string[] = [];
    const reportValues: unknown[] = [];
    if (updates.itemDate !== undefined) {
      reportValues.push(updates.itemDate);
      reportFields.push(`date = $${reportValues.length + 1}`);
    }
    if (updates.itemTime !== undefined) {
      reportValues.push(updates.itemTime || null);
      reportFields.push(`time = $${reportValues.length + 1}`);
    }
    if (updates.importantDetails !== undefined) {
      reportValues.push(updates.importantDetails || null);
      reportFields.push(`important_details = $${reportValues.length + 1}`);
    }
    if (updates.location !== undefined || updates.building !== undefined) {
      const existingLoc = await client.query<{
        building_id: string | null;
        description: string | null;
      }>(
        `SELECT l.building_id, l.description
         FROM item i
         JOIN report r ON r.id = i.report_id
         LEFT JOIN location l ON l.id = r.location_id
         WHERE i.id = $1 LIMIT 1`,
        [id],
      );
      const buildingId =
        updates.building !== undefined
          ? updates.building
            ? await upsertBuilding(client, updates.building)
            : null
          : existingLoc.rows[0]?.building_id ?? null;
      const locationDesc =
        updates.location !== undefined
          ? updates.location ?? ''
          : existingLoc.rows[0]?.description ?? '';

      if (!locationDesc && !buildingId) {
        reportFields.push(`location_id = NULL`);
      } else {
        const locationId = await upsertLocation(client, buildingId, locationDesc);
        reportValues.push(locationId);
        reportFields.push(`location_id = $${reportValues.length + 1}`);
      }
    }
    if (reportFields.length > 0) {
      await client.query(
        `UPDATE report SET ${reportFields.join(', ')}, updated_at = NOW()
         WHERE id = (SELECT report_id FROM item WHERE id = $1)`,
        [id, ...reportValues],
      );
    }
    if (updates.images !== undefined) {
      await client.query(`DELETE FROM image WHERE item_id = $1`, [id]);
      for (let i = 0; i < updates.images.length; i++) {
        const imgUrl = updates.images[i];
        const blurredUrl = updates.blurredImages?.[i] || null;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
          await client.query(
            `INSERT INTO image (item_id, image_url, blurred_image_url) VALUES ($1, $2, $3)`,
            [id, imgUrl.trim(), blurredUrl ? blurredUrl.trim() : null],
          );
        }
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return findItemById(id, isAdmin, viewerId);
}

export async function updateOsaReceipt(
  id: string,
  receivedByOsa: boolean,
  viewerId: string,
): Promise<Item | null> {
  if (!receivedByOsa) {
    const { rows: resolved } = await pool.query<{ id: string }>(
      `SELECT rq.id
       FROM request rq
       WHERE rq.item_id = $1
         AND rq.status IN ('approved', 'claimed', 'returned')
       LIMIT 1`,
      [id],
    );
    if (resolved[0]) {
      throw new CannotRevokeOsaReceiptError();
    }
  }
  const { rowCount } = await pool.query(
    `UPDATE item AS i
     SET received_by_osa = $2, updated_at = NOW()
     WHERE i.id = $1
       AND EXISTS (
         SELECT 1 FROM report r
         WHERE r.id = i.report_id AND r.report_type = 'found'
       )`,
    [id, receivedByOsa],
  );
  return (rowCount ?? 0) > 0 ? findItemById(id, true, viewerId) : null;
}

/** Deletes the parent report; the item row cascades. */
export async function deleteItem(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM report WHERE id = (SELECT report_id FROM item WHERE id = $1)`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Retrieves an image of an item by index (default 0) for the dynamic blur endpoint fallback.
 */
export async function findItemImageForBlur(
  itemId: string,
  imageIndex: number = 0,
): Promise<{ id: string; imageUrl: string; blurredImageUrl: string | null; reportType: ReportType } | null> {
  const safeOffset = Number.isInteger(imageIndex) && imageIndex >= 0 ? imageIndex : 0;
  const { rows } = await pool.query<{
    id: string;
    image_url: string;
    blurred_image_url: string | null;
    report_type: ReportType;
  }>(
    `SELECT img.id, img.image_url, img.blurred_image_url, r.report_type
     FROM image img
     JOIN item i ON i.id = img.item_id
     JOIN report r ON r.id = i.report_id
     WHERE i.id = $1
     ORDER BY img.created_at ASC
     OFFSET $2
     LIMIT 1`,
    [itemId, safeOffset],
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    imageUrl: rows[0].image_url,
    blurredImageUrl: rows[0].blurred_image_url,
    reportType: rows[0].report_type,
  };
}

/**
 * Updates the blurred image URL for a given image row.
 */
export async function saveBlurredImageUrl(imageId: string, blurredUrl: string): Promise<void> {
  await pool.query(`UPDATE image SET blurred_image_url = $1 WHERE id = $2`, [blurredUrl, imageId]);
}

export class DuplicateItemFlagError extends Error {
  constructor() {
    super('You have already reported this post.');
    this.name = 'DuplicateItemFlagError';
  }
}

/** Creates a moderation flag on an item; throws DuplicateItemFlagError if this user already reported it. */
export async function createItemFlag(
  itemId: string,
  reporterId: string,
  reason: string,
): Promise<{ id: string }> {
  const existing = await pool.query(
    `SELECT 1 FROM item_flag WHERE item_id = $1 AND reporter_id = $2 LIMIT 1`,
    [itemId, reporterId],
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw new DuplicateItemFlagError();
  }
  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO item_flag (item_id, reporter_id, reason)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [itemId, reporterId, reason],
    );
    return { id: rows[0].id };
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw new DuplicateItemFlagError();
    }
    throw err;
  }
}

/** Marks all open flags on an item as dismissed by the acting admin. */
export async function dismissItemFlags(itemId: string, adminId: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE item_flag
     SET dismissed_at = NOW(), dismissed_by = $2
     WHERE item_id = $1 AND dismissed_at IS NULL`,
    [itemId, adminId],
  );
  return rowCount ?? 0;
}

export const FOUND_ITEM_SURRENDER_EXPIRY_DAYS = 14;
export const FOUND_ITEM_SURRENDER_WARNING_DAYS = 11;

/**
 * Sends a one-time pre-deletion reminder notification to finders whose Found
 * item post has not been surrendered to OSA (`received_by_osa = FALSE`) once
 * the post reaches `warningAgeDays` (default 11 days — 3 days before the
 * 14-day auto-delete).
 */
export async function warnExpiringUnsurrenderedFoundItems(
  warningAgeDays = FOUND_ITEM_SURRENDER_WARNING_DAYS,
  maxAgeDays = FOUND_ITEM_SURRENDER_EXPIRY_DAYS,
): Promise<{ warnedCount: number; warnedItemIds: string[] }> {
  const safeMaxDays = Math.max(2, Math.floor(maxAgeDays));
  const safeWarningDays = Math.min(Math.max(1, Math.floor(warningAgeDays)), safeMaxDays - 1);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: expiring } = await client.query<{
      item_id: string;
      item_name: string;
      reporter_id: string;
      days_left: number;
    }>(
      `SELECT i.id AS item_id,
              i.name AS item_name,
              r.user_id AS reporter_id,
              GREATEST(
                1,
                CEIL(
                  EXTRACT(EPOCH FROM ((i.created_at + ($2::int * INTERVAL '1 day')) - NOW())) / 86400.0
                )::int
              ) AS days_left
       FROM item i
       JOIN report r ON r.id = i.report_id
       WHERE r.report_type = 'found'
         AND i.received_by_osa = FALSE
         AND i.expiry_warning_sent_at IS NULL
         AND i.created_at <= NOW() - ($1::int * INTERVAL '1 day')
         AND i.created_at > NOW() - ($2::int * INTERVAL '1 day')
         AND NOT EXISTS (
           SELECT 1 FROM request rq
           WHERE rq.item_id = i.id
             AND rq.status IN ('approved', 'claimed', 'returned')
         )
       FOR UPDATE OF i SKIP LOCKED`,
      [safeWarningDays, safeMaxDays],
    );

    const warnedItemIds: string[] = [];

    for (const row of expiring) {
      const daysLeft = Math.max(1, Number(row.days_left) || 1);
      await client.query(
        `INSERT INTO notification (user_id, item_id, request_id, kind, event, title, message)
         VALUES ($1, $2, NULL, 'item', 'submitted', 'Found post expiring soon', $3)`,
        [
          row.reporter_id,
          row.item_id,
          `Reminder: Your found item post "${row.item_name}" has not been turned over to OSA yet. Please surrender it to the OSA office within ${daysLeft} day${daysLeft === 1 ? '' : 's'} or the post will be automatically deleted.`,
        ],
      );

      await client.query(
        `UPDATE item SET expiry_warning_sent_at = NOW() WHERE id = $1`,
        [row.item_id],
      );
      warnedItemIds.push(row.item_id);
    }

    await client.query('COMMIT');
    return { warnedCount: warnedItemIds.length, warnedItemIds };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Automatically deletes Found item posts that have not been surrendered to OSA
 * (`received_by_osa = FALSE`) after `maxAgeDays` (default 14 days / 2 weeks).
 * Notifies the finder and any pending claimants before deleting the report.
 */
export async function deleteExpiredUnsurrenderedFoundItems(
  maxAgeDays = FOUND_ITEM_SURRENDER_EXPIRY_DAYS,
): Promise<{ deletedCount: number; deletedItemIds: string[] }> {
  const safeDays = Math.max(1, Math.floor(maxAgeDays));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: expired } = await client.query<{
      item_id: string;
      report_id: string;
      item_name: string;
      reporter_id: string;
    }>(
      `SELECT i.id AS item_id, i.report_id, i.name AS item_name, r.user_id AS reporter_id
       FROM item i
       JOIN report r ON r.id = i.report_id
       WHERE r.report_type = 'found'
         AND i.received_by_osa = FALSE
         AND i.created_at <= NOW() - ($1::int * INTERVAL '1 day')
         AND NOT EXISTS (
           SELECT 1 FROM request rq
           WHERE rq.item_id = i.id
             AND rq.status IN ('approved', 'claimed', 'returned')
         )
       FOR UPDATE OF i SKIP LOCKED`,
      [safeDays],
    );

    const deletedItemIds: string[] = [];

    for (const row of expired) {
      const { rows: pendingClaimants } = await client.query<{ user_id: string }>(
        `SELECT DISTINCT user_id
         FROM request
         WHERE item_id = $1
           AND kind = 'claim'
           AND status = 'pending'
           AND user_id IS NOT NULL`,
        [row.item_id],
      );

      await client.query(
        `INSERT INTO notification (user_id, item_id, request_id, kind, event, title, message)
         VALUES ($1, NULL, NULL, 'item', 'deleted', 'Found post expired', $2)`,
        [
          row.reporter_id,
          `Your found item post "${row.item_name}" was automatically deleted because the item was not surrendered to OSA within ${safeDays} days.`,
        ],
      );

      for (const claimant of pendingClaimants) {
        if (claimant.user_id === row.reporter_id) continue;
        await client.query(
          `INSERT INTO notification (user_id, item_id, request_id, kind, event, title, message)
           VALUES ($1, NULL, NULL, 'claim', 'rejected', 'Claim cancelled', $2)`,
          [
            claimant.user_id,
            `Your claim for "${row.item_name}" was cancelled because the found item was not surrendered to OSA within ${safeDays} days and the post expired.`,
          ],
        );
      }

      // Deleting the report cascades to item, image, request, and item_flag.
      await client.query(`DELETE FROM report WHERE id = $1`, [row.report_id]);
      deletedItemIds.push(row.item_id);
    }

    await client.query('COMMIT');
    return { deletedCount: deletedItemIds.length, deletedItemIds };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
