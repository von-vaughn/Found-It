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

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportType: row.report_type,
    name: row.name,
    description: row.description,
    itemDate: toDateOnly(row.item_date),
    category: row.category,
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
}): Promise<Item> {
  const { rows } = await pool.query<ItemRow>(
    `INSERT INTO items (reporter_id, report_type, name, description, item_date, category)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.reporterId, input.reportType, input.name, input.description, input.itemDate, input.category],
  );
  return toItem(rows[0]);
}

export async function findItemById(id: string): Promise<Item | null> {
  const { rows } = await pool.query<ItemRow>('SELECT * FROM items WHERE id = $1 LIMIT 1', [id]);
  return rows[0] ? toItem(rows[0]) : null;
}

export async function listItems(filter?: {
  reportType?: ReportType;
  category?: string;
  search?: string;
  reporterId?: string;
}): Promise<Item[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter?.reportType) {
    params.push(filter.reportType);
    conditions.push(`report_type = $${params.length}`);
  }
  if (filter?.category) {
    params.push(filter.category.toLowerCase());
    conditions.push(`LOWER(category) = $${params.length}`);
  }
  if (filter?.reporterId) {
    params.push(filter.reporterId);
    conditions.push(`reporter_id = $${params.length}`);
  }
  if (filter?.search) {
    params.push(`%${filter.search.toLowerCase()}%`);
    conditions.push(
      `(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`,
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<ItemRow>(
    `SELECT * FROM items ${where} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return rows.map(toItem);
}

export async function updateItem(
  id: string,
  updates: { name?: string; description?: string; itemDate?: string; category?: string },
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
  if (fields.length === 0) return findItemById(id);
  const { rows } = await pool.query<ItemRow>(
    `UPDATE items SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values],
  );
  return rows[0] ? toItem(rows[0]) : null;
}

export async function deleteItem(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM items WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}
