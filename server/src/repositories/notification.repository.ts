import type { PoolClient } from "pg";
import { pool } from "../config/db";

export type NotificationKind = "claim" | "return";
export type NotificationEvent =
  | "submitted"
  | "approved"
  | "rejected"
  | "returned";

export interface Notification {
  id: string;
  itemId: string | null;
  requestId: string | null;
  kind: NotificationKind;
  event: NotificationEvent;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  item_id: string | null;
  request_id: string | null;
  kind: NotificationKind;
  event: NotificationEvent;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date | string;
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    itemId: row.item_id,
    requestId: row.request_id,
    kind: row.kind,
    event: row.event,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function createAdminSubmissionNotifications(
  client: PoolClient,
  requestId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO notification (
       user_id, item_id, request_id, kind, event, title, message
     )
     SELECT admin.id, rq.item_id, rq.id, rq.kind, 'submitted',
            CASE rq.kind
              WHEN 'claim' THEN 'New claim request'
              ELSE 'New return request'
            END,
            submitter.first_name || ' ' || submitter.last_name ||
              CASE rq.kind
                WHEN 'claim' THEN ' submitted a claim for '
                ELSE ' submitted a return report for '
              END || item.name || '.'
     FROM request rq
     JOIN item ON item.id = rq.item_id
     JOIN "user" submitter ON submitter.id = rq.user_id
     CROSS JOIN "user" admin
     WHERE rq.id = $1
       AND admin.role IN ('admin', 'super_admin')
       AND admin.is_active = TRUE
       AND admin.is_verified = TRUE`,
    [requestId],
  );
}

export async function createRequestStatusNotification(
  client: PoolClient,
  input: {
    requestId: string;
    itemId: string;
    itemName: string;
    kind: NotificationKind;
    status: NotificationEvent;
    requesterId: string;
    itemOwnerId: string;
  },
): Promise<void> {
  const recipientId =
    input.kind === "claim"
      ? input.requesterId
      : input.status === "approved" || input.status === "returned"
        ? input.requesterId
        : null;
  if (!recipientId || !["approved", "rejected", "returned"].includes(input.status)) {
    return;
  }

  const title =
    input.status === "approved"
      ? input.kind === "return"
        ? "Return request approved"
        : "Claim approved"
      : input.status === "rejected"
        ? "Claim rejected"
        : "Item returned";
  const message =
    input.status === "approved"
      ? input.kind === "return"
        ? `Your return request for ${input.itemName} was approved.`
        : `Your claim for ${input.itemName} was approved.`
      : input.status === "rejected"
        ? `Your claim for ${input.itemName} was rejected.`
        : input.kind === "claim"
          ? `${input.itemName} has been returned to its owner.`
          : `Your return of ${input.itemName} to the OSA office has been recorded.`;

  await client.query(
    `INSERT INTO notification (
       user_id, item_id, request_id, kind, event, title, message
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      recipientId,
      input.itemId,
      input.requestId,
      input.kind,
      input.status,
      title,
      message,
    ],
  );
}

export async function createClaimedNotifications(
  client: PoolClient,
  input: {
    requestId: string;
    itemId: string;
    itemName: string;
    requesterId: string;
    itemOwnerId: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO notification (
       user_id, item_id, request_id, kind, event, title, message
     ) VALUES
       ($1, $2, $3, 'claim', 'approved', 'Claim approved', $4),
       ($5, $2, $3, 'claim', 'returned', 'Item returned', $6)`,
    [
      input.requesterId,
      input.itemId,
      input.requestId,
      "You have successfully claimed this item.",
      input.itemOwnerId,
      `${input.itemName} has been successfully returned to its rightful owner.`,
    ],
  );
}

export async function listNotificationsForUser(
  userId: string,
): Promise<Notification[]> {
  const { rows } = await pool.query<NotificationRow>(
    `SELECT id, item_id, request_id, kind, event, title, message,
            is_read, created_at
     FROM notification
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    [userId],
  );
  return rows.map(toNotification);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE notification
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2 AND is_read = FALSE`,
    [notificationId, userId],
  );
  if (rowCount === 1) return true;

  const { rowCount: existingCount } = await pool.query(
    "SELECT 1 FROM notification WHERE id = $1 AND user_id = $2",
    [notificationId, userId],
  );
  return existingCount === 1;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await pool.query(
    `UPDATE notification
     SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  );
}

export async function deleteNotificationForUser(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    "DELETE FROM notification WHERE id = $1 AND user_id = $2",
    [notificationId, userId],
  );
  return rowCount === 1;
}

export async function deleteReadNotificationsForUser(
  userId: string,
): Promise<void> {
  await pool.query(
    "DELETE FROM notification WHERE user_id = $1 AND is_read = TRUE",
    [userId],
  );
}
