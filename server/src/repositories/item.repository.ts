import type { PoolClient } from 'pg';
import { pool } from '../config/db';
import type { Item, ReportType } from '../types/items';

interface ItemRow {
  id: string;
  reporter_id: string;
  report_type: ReportType;
  is_claimed: boolean;
  is_returned: boolean;
  received_by_osa: boolean;
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
  reporter_name: string;
  reporter_email: string;
  images: Array<{ url: string; blurred_url: string | null }> | null;
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
  i.received_by_osa,
  EXISTS (
    SELECT 1 FROM request claim_request
    WHERE claim_request.item_id = i.id
      AND claim_request.kind = 'claim'
      AND claim_request.status IN ('approved', 'claimed', 'returned')
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
  i.name, i.description, r.date AS item_date,
  r.time AS item_time, i.primary_color AS color,
  r.important_details,
  loc.description AS location, b.name AS building,
  c.id AS category_id, c.name AS category_name,
  u.first_name || ' ' || u.last_name AS reporter_name, u.email AS reporter_email,
  COALESCE(
    (SELECT json_agg(
      json_build_object('url', img.image_url, 'blurred_url', img.blurred_image_url)
      ORDER BY img.created_at ASC
    ) FROM image img WHERE img.item_id = i.id),
    '[]'::json
  ) AS images,
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
 * - Reporter email is gated to admins (super_admin, admin) only.
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
      imageList = rawImages.map((img) => img.blurred_url || `/api/items/${row.id}/image/blurred`);
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
    ...(isAdmin ? { receivedByOsa: row.received_by_osa } : {}),
    name: row.name,
    description: row.description,
    itemDate: toDateOnly(row.item_date),
    itemTime: row.item_time ? row.item_time.slice(0, 5) : null,
    categoryId: row.category_id,
    category: row.category_name,
    color: row.color,
    building: row.building,
    location: row.location,
    image: imageList[0] ?? null,
    images: imageList,
    ...(canSeeMarker && row.important_details
      ? { importantDetails: row.important_details }
      : {}),
    user: isAdmin
      ? { id: row.reporter_id, name: row.reporter_name, email: row.reporter_email }
      : { id: row.reporter_id, name: row.reporter_name },
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function categoryExists(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM category WHERE id = $1 AND is_active = TRUE`,
    [id],
  );
  return (rowCount ?? 0) > 0;
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

/** Creates the parent report row and its item (plus any location) in one transaction. */
export async function createItemWithClient(client: PoolClient, input: {
  reporterId: string;
  reportType: ReportType;
  name: string;
  description: string;
  itemDate: string;
  itemTime?: string;
  categoryId: string;
  color?: string;
  building?: string;
  location?: string;
  importantDetails?: string;
  images?: string[];
  blurredImages?: string[];
}): Promise<{ id: string }> {
  const buildingId = input.building ? await upsertBuilding(client, input.building) : null;
  const locationId = input.location
    ? await upsertLocation(client, buildingId, input.location)
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
    `INSERT INTO item (report_id, category_id, name, description, primary_color)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [reportRows[0].id, input.categoryId, input.name, input.description, input.color ?? null],
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

export async function createItem(input: {
  reporterId: string;
  reportType: ReportType;
  name: string;
  description: string;
  itemDate: string;
  itemTime?: string;
  categoryId: string;
  color?: string;
  building?: string;
  location?: string;
  importantDetails?: string;
  images?: string[];
  blurredImages?: string[];
}): Promise<{ id: string }> {
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
      `(LOWER(i.name) LIKE $${params.length} OR LOWER(i.description) LIKE $${params.length})`,
    );
  }
  if (!isAdmin && !filter?.reporterId) {
    conditions.push(`NOT EXISTS (
      SELECT 1 FROM request claim_request
      WHERE claim_request.item_id = i.id
        AND claim_request.kind = 'claim'
        AND claim_request.status IN ('approved', 'claimed', 'returned')
    )`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<ItemRow>(
    `SELECT ${ITEM_COLUMNS} ${ITEM_JOIN} ${where} ORDER BY i.created_at DESC LIMIT 200`,
    params,
  );
  return rows.map((row) => toItem(row, isAdmin, viewerId));
}

/** Returns reporterId for ownership checks (no reporter PII attached). */
export async function findItemOwner(id: string): Promise<{ reporterId: string } | null> {
  const { rows } = await pool.query<{ reporter_id: string }>(
    `SELECT r.user_id AS reporter_id
     FROM item i JOIN report r ON r.id = i.report_id
     WHERE i.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? { reporterId: rows[0].reporter_id } : null;
}

export async function updateItem(
  id: string,
  updates: {
    name?: string;
    description?: string;
    itemDate?: string;
    itemTime?: string;
    categoryId?: string;
    color?: string;
    importantDetails?: string;
    building?: string;
    location?: string;
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
  if (updates.color !== undefined) {
    itemValues.push(updates.color);
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
      reportValues.push(updates.itemTime);
      reportFields.push(`time = $${reportValues.length + 1}`);
    }
    if (updates.importantDetails !== undefined) {
      reportValues.push(updates.importantDetails);
      reportFields.push(`important_details = $${reportValues.length + 1}`);
    }
    if (updates.location !== undefined) {
      const buildingId = updates.building ? await upsertBuilding(client, updates.building) : null;
      const locationId = await upsertLocation(client, buildingId, updates.location);
      reportValues.push(locationId);
      reportFields.push(`location_id = $${reportValues.length + 1}`);
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
 * Retrieves the first image of an item for the dynamic blur endpoint fallback.
 */
export async function findItemImageForBlur(
  itemId: string,
): Promise<{ id: string; imageUrl: string; blurredImageUrl: string | null; reportType: ReportType } | null> {
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
     LIMIT 1`,
    [itemId],
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
