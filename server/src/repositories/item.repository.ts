import type { PoolClient } from 'pg';
import { pool } from '../config/db';
import type { Item, ReportType } from '../types/items';

interface ItemRow {
  id: string;
  reporter_id: string;
  report_type: ReportType;
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
  images: string[] | null;
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
  i.id, r.user_id AS reporter_id, r.report_type, i.name, i.description, r.date AS item_date,
  r.time AS item_time, i.primary_color AS color,
  r.important_details,
  loc.description AS location, b.name AS building,
  c.id AS category_id, c.name AS category_name,
  u.first_name || ' ' || u.last_name AS reporter_name, u.email AS reporter_email,
  COALESCE(
    (SELECT json_agg(img.image_url ORDER BY img.created_at ASC) FROM image img WHERE img.item_id = i.id),
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
 * Reporter email and the important-details marker are gated: email for
 * admin/super_admin only, importantDetails for the report owner or admin+.
 */
function toItem(row: ItemRow, includeEmail: boolean, viewerId: string): Item {
  const canSeeMarker = includeEmail || row.reporter_id === viewerId;
  const imageList: string[] = Array.isArray(row.images) ? row.images : [];
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportType: row.report_type,
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
    user: includeEmail
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
}): Promise<{ id: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
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
      for (const imgUrl of input.images) {
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
          await client.query(
            `INSERT INTO image (item_id, image_url) VALUES ($1, $2)`,
            [itemId, imgUrl.trim()],
          );
        }
      }
    }
    await client.query('COMMIT');
    return { id: itemId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findItemById(
  id: string,
  includeEmail: boolean,
  viewerId: string,
): Promise<Item | null> {
  const { rows } = await pool.query<ItemRow>(
    `SELECT ${ITEM_COLUMNS} ${ITEM_JOIN} WHERE i.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? toItem(rows[0], includeEmail, viewerId) : null;
}

export async function listItems(
  filter: {
    reportType?: ReportType;
    categoryId?: string;
    search?: string;
    reporterId?: string;
  },
  includeEmail: boolean,
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
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<ItemRow>(
    `SELECT ${ITEM_COLUMNS} ${ITEM_JOIN} ${where} ORDER BY i.created_at DESC LIMIT 200`,
    params,
  );
  return rows.map((row) => toItem(row, includeEmail, viewerId));
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
  },
  includeEmail: boolean,
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
      for (const imgUrl of updates.images) {
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
          await client.query(
            `INSERT INTO image (item_id, image_url) VALUES ($1, $2)`,
            [id, imgUrl.trim()],
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
  return findItemById(id, includeEmail, viewerId);
}

/** Deletes the parent report; the item row cascades. */
export async function deleteItem(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM report WHERE id = (SELECT report_id FROM item WHERE id = $1)`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}
