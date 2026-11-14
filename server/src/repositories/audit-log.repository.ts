import type { PoolClient } from 'pg';
import { pool } from '../config/db';
import type { Role } from '../types/roles';

export type AuditAction =
  | 'approved'
  | 'rejected'
  | 'claimed'
  | 'returned'
  | 'published'
  | 'deleted'
  | 'created'
  | 'updated';

export type AuditEntityType =
  | 'item'
  | 'claim'
  | 'return'
  | 'user'
  | 'category'
  | 'building';

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: 'super_admin';
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  createdAt: string;
}

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: 'super_admin';
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  summary: string;
  created_at: Date | string;
}

function toAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * Records a super_admin audit entry in PostgreSQL.
 * Non-super_admin actors (e.g. regular admins) are intentionally excluded.
 */
export async function recordAuditLog(
  input: {
    actorId: string;
    actorEmail: string;
    actorRole: Role;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    summary: string;
  },
  client?: PoolClient,
): Promise<AuditLogEntry | null> {
  if (input.actorRole !== 'super_admin') return null;

  const runner = client ?? pool;
  const { rows } = await runner.query<AuditLogRow>(
    `INSERT INTO audit_log (
       actor_id, actor_name, actor_role, action, entity_type, entity_id, summary
     )
     VALUES (
       $1,
       COALESCE((SELECT first_name || ' ' || last_name FROM "user" WHERE id = $1), $2),
       'super_admin',
       $3, $4, $5, $6
     )
     RETURNING id, actor_id, actor_name, actor_role, action, entity_type, entity_id, summary, created_at`,
    [
      input.actorId,
      input.actorEmail,
      input.action,
      input.entityType,
      input.entityId,
      input.summary,
    ],
  );
  return rows[0] ? toAuditLogEntry(rows[0]) : null;
}

export async function listAuditLogs(limit = 500): Promise<AuditLogEntry[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 1000);
  const { rows } = await pool.query<AuditLogRow>(
    `SELECT id, actor_id, actor_name, actor_role, action, entity_type, entity_id, summary, created_at
     FROM audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit],
  );
  return rows.map(toAuditLogEntry);
}
