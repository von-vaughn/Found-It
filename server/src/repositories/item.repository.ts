import { pool } from '../config/db';
import type { Item, ReportType } from '../types/items';

interface ItemRow {
  id: string;
  reporter_id: string;
  report_type: ReportType;
  name: string;
  description: string;
  item_date: Date | string;
  category: string;
  reporter_name: string;
  reporter_email: string;
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

const ITEM_COLUMNS = `
  i.id, i.reporter_id, i.report_type, i.name, i.description, i.item_date, i.category,
  u.name AS reporter_name, u.email AS reporter_email,
  i.created_at, i.updated_at
`;
const ITEM_JOIN = `FROM items i JOIN users u ON u.id = i.reporter_id`;

/**
 * Builds the public Item shape.
 * Reporter email is only exposed to admin/super_admin (privacy for school users).
 */
function toItem(row: ItemRow, includeEmail: boolean): Item {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportType: row.report_type,
    name: row.name,
    description: row.description,
    itemDate: toDateOnly(row.item_date),
    category: row.category,
    reporter: includeEmail
      ? { id: row.reporter_id, name: row.reporter_name, email: row.reporter_email }
      : { id: row.reporter_id, name: row.reporter_name },
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function createItem(input: {
  reporterId: string;
  reportType: ReportType;
  name: string;
  description: string;
  itemDate: string;
  category: string;
}): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO items (reporter_id, report_type, name, description, item_date, category)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [input.reporterId, input.reportType, input.name, input.description, input.itemDate, input.category],
  );
  return { id: rows[0].id };
}

export async function findItemById(id: string, includeEmail: boolean): Promise<Item | null> {
  const { rows } = await pool.query<ItemRow>(
    `SELECT ${ITEM_COLUMNS} ${ITEM_JOIN} WHERE i.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? toItem(rows[0], includeEmail) : null;
}

export async function listItems(
  filter: {
    reportType?: ReportType;
    category?: string;
    search?: string;
    reporterId?: string;
  },
  includeEmail: boolean,
): Promise<Item[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter?.reportType) {
    params.push(filter.reportType);
    conditions.push(`i.report_type = $${params.length}`);
  }
  if (filter?.category) {
    params.push(filter.category.toLowerCase());
    conditions.push(`LOWER(i.category) = $${params.length}`);
  }
  if (filter?.reporterId) {
    params.push(filter.reporterId);
    conditions.push(`i.reporter_id = $${params.length}`);
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
  return rows.map((row) => toItem(row, includeEmail));
}

/** Returns reporterId for ownership checks (no reporter PII attached). */
export async function findItemOwner(id: string): Promise<{ reporterId: string } | null> {
  const { rows } = await pool.query<{ reporter_id: string }>(
    `SELECT reporter_id FROM items WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? { reporterId: rows[0].reporter_id } : null;
}

export async function updateItem(
  id: string,
  updates: { name?: string; description?: string; itemDate?: string; category?: string },
  includeEmail: boolean,
): Promise<Item | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (updates.name !== undefined) {
    values.push(updates.name);
    fields.push(`name = $${values.length + 1}`);
  }
  if (updates.description !== undefined) {
    values.push(updates.description);
    fields.push(`description = $${values.length + 1}`);
  }
  if (updates.itemDate !== undefined) {
    values.push(updates.itemDate);
    fields.push(`item_date = $${values.length + 1}`);
  }
  if (updates.category !== undefined) {
    values.push(updates.category);
    fields.push(`category = $${values.length + 1}`);
  }
  if (fields.length === 0) return findItemById(id, includeEmail);
  await pool.query(
    `UPDATE items SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1`,
    [id, ...values],
  );
  return findItemById(id, includeEmail);
}

export async function deleteItem(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM items WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}
