import type { PoolClient } from "pg";
import { pool } from "../config/db";

export type NotificationKind = "claim" | "return" | "item" | "flag";
export type NotificationEvent =
  | "submitted"
  | "approved"
  | "rejected"
  | "returned"
  | "deleted"
  | "flagged";

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

/**
 * Alerts the school_user finder when someone submits a claim on their Found
 * post while the physical item has not yet been received by OSA.
 */
export async function createFinderClaimSubmissionNotification(
  client: PoolClient,
  requestId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO notification (
       user_id, item_id, request_id, kind, event, title, message
     )
     SELECT reporter.id, rq.item_id, rq.id, 'claim', 'submitted',
            'Someone claimed your found item',
            'A claim was submitted for "' || item.name ||
              '". Please surrender the physical item to the OSA office for verification.'
     FROM request rq
     JOIN item ON item.id = rq.item_id
     JOIN report ON report.id = item.report_id
     JOIN "user" reporter ON reporter.id = report.user_id
     WHERE rq.id = $1
       AND rq.kind = 'claim'
       AND item.received_by_osa = FALSE
       AND reporter.id <> rq.user_id
       AND reporter.role = 'school_user'
       AND reporter.is_active = TRUE
       AND reporter.is_verified = TRUE`,
    [requestId],
  );
}

export async function createFinderSurrenderReminderNotification(
  client: PoolClient,
  input: {
    itemId: string;
    itemName: string;
    finderId: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO notification (
       user_id, item_id, request_id, kind, event, title, message
     ) VALUES ($1, $2, NULL, 'claim', 'submitted', $3, $4)`,
    [
      input.finderId,
      input.itemId,
      "Reminder: surrender found item to OSA",
      `OSA reminder: someone claimed "${input.itemName}". Please surrender the physical item to the OSA office for verification.`,
    ],
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
    reason?: string;
    instructions?: string;
  },
): Promise<void> {
  if (!["approved", "rejected", "returned"].includes(input.status)) {
    return;
  }

  // 1. Notify the requester (finder for returns, claimant for claims)
  const requesterTitle =
    input.status === "approved"
      ? input.kind === "return"
        ? "Return request approved"
        : "Claim approved"
      : input.status === "rejected"
        ? input.kind === "return"
          ? "Return request rejected"
          : "Claim rejected"
        : "Item returned";

  const requesterMessage =
    input.status === "approved"
      ? input.kind === "return"
        ? `Your return request for ${input.itemName} was approved.`
        : input.instructions
          ? `Your claim for ${input.itemName} was approved. Instructions: ${input.instructions}`
          : `Your claim for ${input.itemName} was approved.`
      : input.status === "rejected"
        ? input.kind === "return"
          ? input.reason
            ? `Your return request for ${input.itemName} was rejected: ${input.reason}`
            : `Your return request for ${input.itemName} was rejected.`
          : input.reason
            ? `Your claim for ${input.itemName} was rejected: ${input.reason}`
            : `Your claim for ${input.itemName} was rejected.`
        : input.kind === "claim"
          ? `${input.itemName} has been returned to its owner.`
          : `Your return of ${input.itemName} to the OSA office has been recorded.`;

  if (input.requesterId) {
    await client.query(
      `INSERT INTO notification (
         user_id, item_id, request_id, kind, event, title, message
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.requesterId,
        input.itemId,
        input.requestId,
        input.kind,
        input.status,
        requesterTitle,
        requesterMessage,
      ],
    );
  }

  // 2. When a return request is approved or completed, notify the person who lost the item
  if (
    input.kind === "return" &&
    input.itemOwnerId &&
    input.itemOwnerId !== input.requesterId
  ) {
    if (input.status === "approved") {
      await client.query(
        `INSERT INTO notification (
           user_id, item_id, request_id, kind, event, title, message
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.itemOwnerId,
          input.itemId,
          input.requestId,
          "return",
          "approved",
          "Someone returned your lost item",
          `Someone returned your lost item "${input.itemName}". Please visit the OSA office to verify and claim it.`,
        ],
      );
    } else if (input.status === "returned") {
      await client.query(
        `INSERT INTO notification (
           user_id, item_id, request_id, kind, event, title, message
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.itemOwnerId,
          input.itemId,
          input.requestId,
          "return",
          "returned",
          "Lost item returned",
          `Your lost item "${input.itemName}" has been marked as returned to you.`,
        ],
      );
    }
  }
}

export async function createClaimedNotifications(
  client: PoolClient,
  input: {
    requestId: string;
    itemId: string;
    itemName: string;
    requesterId: string;
    itemOwnerId: string;
    status?: "claimed" | "returned";
  },
): Promise<void> {
  const claimantTitle =
    input.status === "returned" ? "Item returned" : "Claim approved";
  const claimantMessage =
    input.status === "returned"
      ? `${input.itemName} has been returned to you.`
      : "You have successfully claimed this item.";

  await client.query(
    `INSERT INTO notification (
       user_id, item_id, request_id, kind, event, title, message
     ) VALUES
       ($1, $2, $3, 'claim', $4, $5, $6),
       ($7, $2, $3, 'claim', 'returned', 'Item returned', $8)`,
    [
      input.requesterId,
      input.itemId,
      input.requestId,
      input.status === "returned" ? "returned" : "approved",
      claimantTitle,
      claimantMessage,
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

export async function createAdminItemFlagNotifications(input: {
  itemId: string;
  itemName: string;
  reporterId: string;
  reason: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO notification (
       user_id, item_id, request_id, kind, event, title, message
     )
     SELECT admin.id, $1, NULL, 'flag', 'flagged',
            'Item report flagged for review',
            flagger.first_name || ' ' || flagger.last_name ||
              ' flagged "' || $2 || '": ' || $4
     FROM "user" flagger
     CROSS JOIN "user" admin
     WHERE flagger.id = $3
       AND admin.role IN ('admin', 'super_admin')
       AND admin.is_active = TRUE
       AND admin.is_verified = TRUE`,
    [input.itemId, input.itemName, input.reporterId, input.reason],
  );
}

export async function createItemDeletedNotification(input: {
  userId: string;
  itemName: string;
  reason: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO notification (
       user_id, item_id, request_id, kind, event, title, message
     )
     VALUES ($1, NULL, NULL, 'item', 'deleted', $2, $3)`,
    [
      input.userId,
      'Your item report was removed',
      `Your report "${input.itemName}" was removed by an administrator. Reason: ${input.reason}`,
    ],
  );
}
