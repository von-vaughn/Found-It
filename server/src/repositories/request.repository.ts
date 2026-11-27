import { pool } from "../config/db";
import {
  CannotRevokeOsaReceiptError,
  createItemWithClient,
  saveBlurredImageUrl,
} from "./item.repository";
import { isDriveConfigured, uploadFileToDrive } from "../utils/google-drive";
import { fetchRemoteImageBuffer, generateBlurredImage } from "../utils/image-blur";
import {
  createClaimedNotifications,
  createAdminSubmissionNotifications,
  createFinderClaimSubmissionNotification,
  createPublishedRejectedReturnNotification,
  createRequestStatusNotification,
  createReturnFinderSurrenderReminderNotification,
} from "./notification.repository";
import type { Claim, ClaimStatus } from "../types/claims";

const RETURN_FINDER_REMINDER_COOLDOWN_MS = 3 * 60 * 60 * 1000;

interface ClaimRow {
  id: string;
  item_id: string;
  item_name: string;
  claimant: string;
  email: string;
  school_id: string | null;
  date_lost: Date | string | null;
  time_lost: string | null;
  location_lost: string | null;
  details: string | null;
  important_details: string | null;
  evidence: string | null;
  claimant_title: string | null;
  primary_color: string | null;
  building: string | null;
  received_by_osa: boolean;
  published_item_id: string | null;
  rejection_reason: string | null;
  approval_instructions: string | null;
  last_finder_reminder_at: Date | string | null;
  released_by_id: string | null;
  released_by_name: string | null;
  released_by_email: string | null;
  released_by_role: "staff" | "admin" | null;
  released_at: Date | string | null;
  is_walkin: boolean;
  status: ClaimStatus;
  created_at: Date | string;
}

const CLAIM_COLUMNS = `
  rq.id, rq.item_id, i.name AS item_name,
  COALESCE(u.first_name || ' ' || u.last_name, rq.walkin_name, 'Walk-in claimant') AS claimant,
  COALESCE(u.email, rq.walkin_contact, '') AS email,
  COALESCE(u.school_id, rq.walkin_school_id) AS school_id,
  rq.date_lost, rq.time_lost, rq.location_lost, rq.details,
  rq.important_details, rq.evidence, rq.claimant_title,
  rq.primary_color, rq.building, rq.received_by_osa, rq.published_item_id,
  rq.rejection_reason, rq.approval_instructions, rq.last_finder_reminder_at,
  rb.id AS released_by_id,
  CASE WHEN rb.id IS NOT NULL THEN rb.first_name || ' ' || rb.last_name ELSE NULL END AS released_by_name,
  rb.email AS released_by_email,
  rb.role AS released_by_role,
  rq.released_at,
  rq.is_walkin,
  rq.status, rq.created_at
`;
const CLAIM_JOIN = `
  FROM request rq
  JOIN item i ON i.id = rq.item_id
  LEFT JOIN "user" u ON u.id = rq.user_id
  LEFT JOIN "user" rb ON rb.id = rq.released_by
`;

function toDateOnly(value: Date | string | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseEvidence(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function toClaim(
  row: ClaimRow,
  includeOsaReceipt = false,
  includeApprovalInstructions = true,
): Claim {
  return {
    id: row.id,
    itemId: row.item_id,
    item: row.item_name,
    claimant: row.claimant,
    email: row.email,
    ...(row.school_id ? { schoolId: row.school_id } : {}),
    dateLost: toDateOnly(row.date_lost),
    timeLost: row.time_lost ? row.time_lost.slice(0, 5) : null,
    location: row.location_lost,
    details: row.details,
    importantDetails: row.important_details,
    evidence: parseEvidence(row.evidence),
    claimantTitle: row.claimant_title,
    color: row.primary_color,
    building: row.building,
    ...(includeOsaReceipt ? { receivedByOsa: row.received_by_osa } : {}),
    publishedItemId: row.published_item_id,
    rejectionReason: row.rejection_reason,
    approvalInstructions: includeApprovalInstructions
      ? row.approval_instructions
      : null,
    ...(includeOsaReceipt
      ? {
          lastFinderReminderAt: row.last_finder_reminder_at
            ? new Date(row.last_finder_reminder_at).toISOString()
            : null,
          releasedBy:
            row.released_by_id && row.released_by_name
              ? {
                  id: row.released_by_id,
                  name: row.released_by_name,
                  ...(row.released_by_email
                    ? { email: row.released_by_email }
                    : {}),
                  ...(row.released_by_role === "staff" ||
                  row.released_by_role === "admin"
                    ? { role: row.released_by_role }
                    : {}),
                }
              : null,
          releasedAt: row.released_at
            ? new Date(row.released_at).toISOString()
            : null,
        }
      : {}),
    ...(row.is_walkin ? { isWalkIn: true } : {}),
    status: row.status,
    submitted: new Date(row.created_at).toISOString(),
  };
}

export async function findClaimableItem(itemId: string): Promise<{
  reporterId: string;
  reportType: "lost" | "found";
  itemDate: string;
  itemTime: string | null;
} | null> {
  const { rows } = await pool.query<{
    reporter_id: string;
    report_type: "lost" | "found";
    item_date: Date | string;
    item_time: string | null;
  }>(
    `SELECT r.user_id AS reporter_id, r.report_type, r.date AS item_date, r.time AS item_time
     FROM item i
     JOIN report r ON r.id = i.report_id
     WHERE i.id = $1
       AND NOT EXISTS (
         SELECT 1 FROM request resolved_request
         WHERE resolved_request.item_id = i.id
           AND (
             (resolved_request.kind = 'claim'
               AND resolved_request.status IN ('claimed', 'returned'))
             OR (resolved_request.kind = 'return'
               AND resolved_request.status = 'returned')
           )
       )
     LIMIT 1`,
    [itemId],
  );
  if (!rows[0]) return null;
  return {
    reporterId: rows[0].reporter_id,
    reportType: rows[0].report_type,
    itemDate: toDateOnly(rows[0].item_date) ?? "",
    itemTime: rows[0].item_time ? rows[0].item_time.slice(0, 5) : null,
  };
}

export async function findItemEventTiming(
  itemId: string,
): Promise<{ itemDate: string; itemTime: string | null } | null> {
  const { rows } = await pool.query<{
    item_date: Date | string;
    item_time: string | null;
  }>(
    `SELECT r.date AS item_date, r.time AS item_time
     FROM item i
     JOIN report r ON r.id = i.report_id
     WHERE i.id = $1
     LIMIT 1`,
    [itemId],
  );
  if (!rows[0]) return null;
  return {
    itemDate: toDateOnly(rows[0].item_date) ?? "",
    itemTime: rows[0].item_time ? rows[0].item_time.slice(0, 5) : null,
  };
}

export async function countRejectedClaimsForUserAndItem(
  userId: string,
  itemId: string,
): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM request
     WHERE user_id = $1 AND item_id = $2 AND kind = 'claim' AND status = 'rejected'`,
    [userId, itemId],
  );
  return rows[0]?.count ?? 0;
}

export async function countRejectedReturnsForUserAndItem(
  userId: string,
  itemId: string,
): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM request
     WHERE user_id = $1 AND item_id = $2 AND kind = 'return' AND status = 'rejected'`,
    [userId, itemId],
  );
  return rows[0]?.count ?? 0;
}

export type SendReturnFinderReminderResult =
  | { status: "not_found" }
  | { status: "not_pending" }
  | { status: "already_received" }
  | { status: "inactive_finder" }
  | { status: "cooldown"; nextAllowedAt: string }
  | { status: "sent"; itemName: string; lastFinderReminderAt: string };

/**
 * Sends a surrender reminder notification to the finder on a pending return
 * request that has not yet been received by OSA, enforcing a 3-hour cooldown.
 */
export async function sendReturnFinderReminder(
  requestId: string,
): Promise<SendReturnFinderReminderResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: string;
      item_id: string;
      item_name: string;
      status: ClaimStatus;
      received_by_osa: boolean;
      last_finder_reminder_at: Date | string | null;
      finder_id: string;
      finder_active: boolean;
      finder_verified: boolean;
    }>(
      `SELECT rq.id, rq.item_id, i.name AS item_name, rq.status,
              rq.received_by_osa, rq.last_finder_reminder_at,
              u.id AS finder_id, u.is_active AS finder_active,
              u.is_verified AS finder_verified
       FROM request rq
       JOIN item i ON i.id = rq.item_id
       JOIN "user" u ON u.id = rq.user_id
       WHERE rq.id = $1 AND rq.kind = 'return'
       FOR UPDATE OF rq`,
      [requestId],
    );
    const row = rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { status: "not_found" };
    }
    if (row.status !== "pending") {
      await client.query("ROLLBACK");
      return { status: "not_pending" };
    }
    if (row.received_by_osa) {
      await client.query("ROLLBACK");
      return { status: "already_received" };
    }
    if (!row.finder_active || !row.finder_verified) {
      await client.query("ROLLBACK");
      return { status: "inactive_finder" };
    }
    if (row.last_finder_reminder_at) {
      const lastSentMs = new Date(row.last_finder_reminder_at).getTime();
      const nextAllowedMs = lastSentMs + RETURN_FINDER_REMINDER_COOLDOWN_MS;
      if (!Number.isNaN(lastSentMs) && nextAllowedMs > Date.now()) {
        await client.query("ROLLBACK");
        return {
          status: "cooldown",
          nextAllowedAt: new Date(nextAllowedMs).toISOString(),
        };
      }
    }

    const { rows: updatedRows } = await client.query<{
      last_finder_reminder_at: Date | string;
    }>(
      `UPDATE request
       SET last_finder_reminder_at = NOW()
       WHERE id = $1
       RETURNING last_finder_reminder_at`,
      [requestId],
    );
    await createReturnFinderSurrenderReminderNotification(client, {
      itemId: row.item_id,
      requestId: row.id,
      itemName: row.item_name,
      finderId: row.finder_id,
    });
    await client.query("COMMIT");
    return {
      status: "sent",
      itemName: row.item_name,
      lastFinderReminderAt: new Date(
        updatedRows[0].last_finder_reminder_at,
      ).toISOString(),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function findClaimById(
  id: string,
  includeOsaReceipt = false,
): Promise<Claim | null> {
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN} WHERE rq.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? toClaim(rows[0], includeOsaReceipt) : null;
}

async function findRequestForUserAndItem(
  userId: string,
  itemId: string,
  kind: "claim" | "return",
  excludeRejected = false,
): Promise<Claim | null> {
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN}
     WHERE rq.user_id = $1 AND rq.item_id = $2 AND rq.kind = $3
       AND (NOT $4 OR rq.status <> 'rejected')
     ORDER BY rq.created_at DESC
     LIMIT 1`,
    [userId, itemId, kind, excludeRejected],
  );
  return rows[0] ? toClaim(rows[0], false, kind !== "return") : null;
}

async function findRequestForUserById(
  userId: string,
  requestId: string,
  kind: "claim" | "return",
): Promise<Claim | null> {
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN}
     WHERE rq.id = $1 AND rq.user_id = $2 AND rq.kind = $3
     LIMIT 1`,
    [requestId, userId, kind],
  );
  return rows[0] ? toClaim(rows[0], kind === "return", kind !== "return") : null;
}

export function findClaimForUserAndItem(
  userId: string,
  itemId: string,
): Promise<Claim | null> {
  return findRequestForUserAndItem(userId, itemId, "claim", true);
}

export function findReturnForUserAndItem(
  userId: string,
  itemId: string,
): Promise<Claim | null> {
  return findRequestForUserAndItem(userId, itemId, "return", true);
}

export function findClaimForUserById(
  userId: string,
  requestId: string,
): Promise<Claim | null> {
  return findRequestForUserById(userId, requestId, "claim");
}

export function findReturnForUserById(
  userId: string,
  requestId: string,
): Promise<Claim | null> {
  return findRequestForUserById(userId, requestId, "return");
}

async function listRequestsByUser(
  userId: string,
  kind: "claim" | "return",
): Promise<Claim[]> {
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN}
     WHERE rq.user_id = $1 AND rq.kind = $2
     ORDER BY rq.created_at DESC
     LIMIT 200`,
    [userId, kind],
  );
  return rows.map((row) => toClaim(row, true, kind !== "return"));
}

export function listClaimsByUser(userId: string): Promise<Claim[]> {
  return listRequestsByUser(userId, "claim");
}

export function listReturnsByUser(userId: string): Promise<Claim[]> {
  return listRequestsByUser(userId, "return");
}

/** Lists return requests filed on a specific item (for lost item owner or admin). */
export async function listReturnsByItem(
  itemId: string,
  isAdmin = false,
): Promise<Claim[]> {
  const statusClause = isAdmin
    ? ""
    : "AND rq.status IN ('approved', 'returned')";
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN}
     WHERE rq.item_id = $1 AND rq.kind = 'return' ${statusClause}
     ORDER BY rq.created_at DESC`,
    [itemId],
  );
  return rows.map((row) => {
    const claim = toClaim(row, isAdmin);
    if (isAdmin) return claim;
    return {
      ...claim,
      receivedByOsa: row.received_by_osa,
      evidence: claim.evidence.map(
        (_, index) => `/api/returns/${claim.id}/evidence/blurred?index=${index}`,
      ),
    };
  });
}

/**
 * Retrieves an evidence image URL of an approved/returned return request by index
 * for server-side blurring when displayed to the lost-item owner.
 */
export async function findReturnEvidenceImageForBlur(
  requestId: string,
  imageIndex = 0,
): Promise<string | null> {
  const { rows } = await pool.query<{ evidence: string | null }>(
    `SELECT evidence
     FROM request
     WHERE id = $1
       AND kind = 'return'
       AND status IN ('approved', 'returned')
     LIMIT 1`,
    [requestId],
  );
  if (!rows[0]) return null;
  const images = parseEvidence(rows[0].evidence);
  return images[imageIndex] ?? null;
}

async function listAllRequestsPage(
  kind: "claim" | "return",
  pagination: { limit: number; offset: number } = { limit: 500, offset: 0 },
): Promise<{ items: Claim[]; hasMore: boolean }> {
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN}
     WHERE rq.kind = $1
     ORDER BY rq.created_at DESC, rq.id DESC
     LIMIT $2 OFFSET $3`,
    [kind, pagination.limit + 1, pagination.offset],
  );
  const hasMore = rows.length > pagination.limit;
  const pageRows = hasMore ? rows.slice(0, pagination.limit) : rows;
  return {
    items: pageRows.map((row) => toClaim(row, true)),
    hasMore,
  };
}

/** Every ownership claim, for the admin claims workspace (paginated). */
export function listAllClaimsPage(
  pagination?: { limit: number; offset: number },
): Promise<{ items: Claim[]; hasMore: boolean }> {
  return listAllRequestsPage("claim", pagination);
}

/** Every ownership claim, for the admin claims workspace. */
export async function listAllClaims(): Promise<Claim[]> {
  const { items } = await listAllRequestsPage("claim");
  return items;
}

/** Every found report filed on a lost post, for the admin returns workspace (paginated). */
export function listAllReturnsPage(
  pagination?: { limit: number; offset: number },
): Promise<{ items: Claim[]; hasMore: boolean }> {
  return listAllRequestsPage("return", pagination);
}

/** Every found report filed on a lost post, for the admin returns workspace. */
export async function listAllReturns(): Promise<Claim[]> {
  const { items } = await listAllRequestsPage("return");
  return items;
}

export type PublishRejectedReturnResult =
  | { status: "not_found" }
  | { status: "not_rejected" }
  | { status: "not_received" }
  | { status: "already_published"; itemId: string }
  | { status: "invalid_data"; message: string }
  | { status: "published"; itemId: string };

async function blurPublishedItemImages(itemId: string): Promise<void> {
  if (!isDriveConfigured()) return;
  const { rows: insertedImages } = await pool.query<{
    id: string;
    image_url: string;
  }>(
    `SELECT id, image_url FROM image WHERE item_id = $1 AND blurred_image_url IS NULL`,
    [itemId],
  );
  for (const img of insertedImages) {
    try {
      const remoteBuffer = await fetchRemoteImageBuffer(img.image_url);
      const blurredBuffer = await generateBlurredImage(remoteBuffer);
      const uploaded = await uploadFileToDrive({
        name: `blurred-${Date.now()}-${itemId}.jpg`,
        mimeType: "image/jpeg",
        content: blurredBuffer,
      });
      await saveBlurredImageUrl(img.id, uploaded.directUrl);
    } catch (err) {
      console.warn(
        `[Publish] Could not generate blurred image for ${img.id}:`,
        err,
      );
    }
  }
}

/** Publishes a rejected found report as a public found-item post exactly once. */
export async function publishRejectedReturn(
  requestId: string,
  fallbackReporterId?: string,
): Promise<PublishRejectedReturnResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      user_id: string | null;
      status: ClaimStatus;
      received_by_osa: boolean;
      published_item_id: string | null;
      claimant_title: string | null;
      primary_color: string | null;
      building: string | null;
      date_lost: Date | string | null;
      time_lost: string | null;
      location_lost: string | null;
      details: string | null;
      important_details: string | null;
      evidence: string | null;
      category_id: string;
      custom_category: string | null;
      item_name: string;
    }>(
      `SELECT rq.user_id, rq.status, rq.received_by_osa, rq.published_item_id,
              rq.claimant_title, rq.primary_color, rq.building, rq.date_lost,
              rq.time_lost, rq.location_lost, rq.details, rq.important_details,
              rq.evidence, item.category_id, item.custom_category,
              item.name AS item_name
       FROM request rq
       JOIN item ON item.id = rq.item_id
       WHERE rq.id = $1 AND rq.kind = 'return'
       FOR UPDATE OF rq`,
      [requestId],
    );
    const request = rows[0];
    if (!request) {
      await client.query("ROLLBACK");
      return { status: "not_found" };
    }
    if (request.published_item_id) {
      await client.query("COMMIT");
      return {
        status: "already_published",
        itemId: request.published_item_id,
      };
    }
    if (request.status !== "rejected") {
      await client.query("ROLLBACK");
      return { status: "not_rejected" };
    }
    if (!request.received_by_osa) {
      await client.query("ROLLBACK");
      return { status: "not_received" };
    }

    const name = request.claimant_title?.trim() || request.item_name;
    const description = request.details?.trim() ?? "";
    const itemDate = toDateOnly(request.date_lost);
    const location = request.location_lost?.trim();
    if (!itemDate || !location || description.length < 10) {
      await client.query("ROLLBACK");
      return {
        status: "invalid_data",
        message:
          "This report is missing a found date, location, or item description required for a public post.",
      };
    }

    const reporterId = request.user_id ?? fallbackReporterId;
    if (!reporterId) {
      await client.query("ROLLBACK");
      return {
        status: "invalid_data",
        message: "Unable to determine a reporter account for this published item.",
      };
    }

    const created = await createItemWithClient(client, {
      reporterId,
      reportType: "found",
      name,
      description,
      itemDate,
      itemTime: request.time_lost?.slice(0, 5) ?? undefined,
      categoryId: request.category_id,
      customCategory: request.custom_category,
      color: request.primary_color ?? undefined,
      building: request.building ?? undefined,
      location,
      importantDetails: request.important_details ?? undefined,
      images: parseEvidence(request.evidence),
      receivedByOsa: true,
    });
    await client.query(
      "UPDATE request SET published_item_id = $2 WHERE id = $1",
      [requestId, created.id],
    );
    if (request.user_id) {
      await createPublishedRejectedReturnNotification(client, {
        finderId: request.user_id,
        publishedItemId: created.id,
        requestId,
        itemName: name,
      });
    }
    await client.query("COMMIT");

    await blurPublishedItemImages(created.id);

    return { status: "published", itemId: created.id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateReturnOsaReceipt(
  requestId: string,
  receivedByOsa: boolean,
): Promise<Claim | null> {
  if (!receivedByOsa) {
    const { rows: existing } = await pool.query<{ status: ClaimStatus }>(
      `SELECT status FROM request WHERE id = $1 AND kind = 'return' LIMIT 1`,
      [requestId],
    );
    if (!existing[0]) return null;
    if (existing[0].status === "approved" || existing[0].status === "returned") {
      throw new CannotRevokeOsaReceiptError();
    }
  }
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE request
     SET received_by_osa = $2
     WHERE id = $1 AND kind = 'return'
     RETURNING id`,
    [requestId, receivedByOsa],
  );
  return rows[0] ? findClaimById(rows[0].id, true) : null;
}

export function allowedStatusPredecessors(
  kind: "claim" | "return",
  status: ClaimStatus,
): ClaimStatus[] {
  if (status === "rejected") {
    return ["pending", "approved"];
  }
  if (status === "approved" || status === "claimed" || status === "returned") {
    return status === "approved" ? ["pending"] : ["approved"];
  }
  return [];
}

export class PhysicalItemNotReceivedError extends Error {
  constructor() {
    super("The physical item must be received by OSA before this request can be approved.");
    this.name = "PhysicalItemNotReceivedError";
  }
}

export class AnotherClaimAlreadyApprovedError extends Error {
  constructor(kind: "claim" | "return" = "claim") {
    super(
      kind === "return"
        ? "Another return request for this item is already approved. Reject it first before approving another."
        : "Another claim for this item is already approved. Reject it first before approving another.",
    );
    this.name = "AnotherClaimAlreadyApprovedError";
  }
}

async function updateRequestStatusById(
  kind: "claim" | "return",
  id: string,
  status: ClaimStatus,
  rejectionReason?: string,
  approvalInstructions?: string,
  releasedByUserId?: string,
): Promise<Claim | null> {
  const autoPublishedItemIds: string[] = [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (status === "approved" || status === "claimed" || status === "returned") {
      await client.query(
        `SELECT item.id
         FROM item
         JOIN request ON request.item_id = item.id
         WHERE request.id = $1 AND request.kind = $2
         FOR UPDATE OF item`,
        [id, kind],
      );
    }
    const predecessors = allowedStatusPredecessors(kind, status);
    const { rows } = await client.query<{
      user_id: string | null;
      item_id: string;
      item_name: string;
      category_id: string;
      custom_category: string | null;
      item_owner_id: string;
      status: ClaimStatus;
      item_received_by_osa: boolean;
      request_received_by_osa: boolean;
      published_item_id: string | null;
      claimant_title: string | null;
      primary_color: string | null;
      building: string | null;
      date_lost: Date | string | null;
      time_lost: string | null;
      location_lost: string | null;
      details: string | null;
      important_details: string | null;
      evidence: string | null;
    }>(
      `SELECT rq.user_id, rq.item_id, item.name AS item_name,
              item.category_id, item.custom_category,
              report.user_id AS item_owner_id, rq.status,
              item.received_by_osa AS item_received_by_osa,
              rq.received_by_osa AS request_received_by_osa,
              rq.published_item_id, rq.claimant_title, rq.primary_color,
              rq.building, rq.date_lost, rq.time_lost, rq.location_lost,
              rq.details, rq.important_details, rq.evidence
       FROM request rq
       JOIN item ON item.id = rq.item_id
       JOIN report ON report.id = item.report_id
       WHERE rq.id = $1 AND rq.kind = $2
       FOR UPDATE OF rq`,
      [id, kind],
    );
    const current = rows[0];
    if (!current || !predecessors.includes(current.status)) {
      await client.query("ROLLBACK");
      return null;
    }
    if (
      status === "approved" &&
      !(kind === "claim"
        ? current.item_received_by_osa
        : current.request_received_by_osa)
    ) {
      await client.query("ROLLBACK");
      throw new PhysicalItemNotReceivedError();
    }
    if (status === "approved") {
      const { rows: existingApproved } = await client.query<{ id: string }>(
        `SELECT id
         FROM request
         WHERE item_id = $1
           AND kind = $2
           AND status IN ('approved', 'claimed', 'returned')
           AND id <> $3
         LIMIT 1`,
        [current.item_id, kind, id],
      );
      if (existingApproved[0]) {
        await client.query("ROLLBACK");
        throw new AnotherClaimAlreadyApprovedError(kind);
      }
    }

    const trimmedReason = rejectionReason?.trim() || null;
    const trimmedInstructions = approvalInstructions?.trim() || null;
    const isReleaseTransition = status === "claimed" || status === "returned";
    const { rowCount } = await client.query(
      status === "rejected"
        ? `UPDATE request
           SET status = $2, rejection_reason = $5, approval_instructions = NULL
           WHERE id = $1 AND kind = $3 AND status = $4`
        : status === "approved"
          ? `UPDATE request
             SET status = $2, approval_instructions = $5
             WHERE id = $1 AND kind = $3 AND status = $4`
          : isReleaseTransition
            ? `UPDATE request
               SET status = $2, released_by = $5, released_at = NOW()
               WHERE id = $1 AND kind = $3 AND status = $4`
            : `UPDATE request
               SET status = $2
               WHERE id = $1 AND kind = $3 AND status = $4`,
      status === "rejected"
        ? [id, status, kind, current.status, trimmedReason]
        : status === "approved"
          ? [id, status, kind, current.status, trimmedInstructions]
          : isReleaseTransition
            ? [id, status, kind, current.status, releasedByUserId ?? null]
            : [id, status, kind, current.status],
    );
    if (rowCount !== 1) {
      await client.query("ROLLBACK");
      return null;
    }

    const isRejectingApprovedReturn =
      kind === "return" &&
      status === "rejected" &&
      current.status === "approved";

    if (isRejectingApprovedReturn) {
      let publishedItemId = current.published_item_id;
      if (!publishedItemId) {
        const publishedName =
          current.claimant_title?.trim() || current.item_name;
        const publishedDescription =
          current.details?.trim() ||
          "Found item submitted via return request.";
        const publishedDate =
          toDateOnly(current.date_lost) ??
          new Date().toISOString().slice(0, 10);
        const created = await createItemWithClient(client, {
          reporterId: current.user_id ?? releasedByUserId ?? current.item_owner_id,
          reportType: "found",
          name: publishedName,
          description: publishedDescription,
          itemDate: publishedDate,
          itemTime: current.time_lost?.slice(0, 5) ?? undefined,
          categoryId: current.category_id,
          customCategory: current.custom_category,
          color: current.primary_color ?? undefined,
          building: current.building ?? undefined,
          location: current.location_lost?.trim() || undefined,
          importantDetails: current.important_details ?? undefined,
          images: parseEvidence(current.evidence),
          receivedByOsa: Boolean(current.request_received_by_osa),
        });
        await client.query(
          "UPDATE request SET published_item_id = $2 WHERE id = $1",
          [id, created.id],
        );
        publishedItemId = created.id;
        autoPublishedItemIds.push(created.id);
      }

      await createRequestStatusNotification(client, {
        requestId: id,
        itemId: publishedItemId,
        ownerItemId: current.item_id,
        itemName: current.item_name,
        kind,
        status: "rejected",
        requesterId: current.user_id,
        itemOwnerId: current.item_owner_id,
        reason:
          "Your found report has been automatically posted as a public found item so its rightful owner can claim it.",
        notifyOwnerOnReturnRejected: true,
      });
    } else if (
      kind === "claim" &&
      (status === "claimed" || status === "returned")
    ) {
      await createClaimedNotifications(client, {
        requestId: id,
        itemId: current.item_id,
        itemName: current.item_name,
        requesterId: current.user_id,
        itemOwnerId: current.item_owner_id,
        status,
      });
    } else if (
      status === "approved" ||
      status === "rejected" ||
      status === "returned"
    ) {
      await createRequestStatusNotification(client, {
        requestId: id,
        itemId: current.item_id,
        itemName: current.item_name,
        kind,
        status,
        requesterId: current.user_id,
        itemOwnerId: current.item_owner_id,
        reason: status === "rejected" ? (trimmedReason ?? undefined) : undefined,
        instructions:
          status === "approved" ? (trimmedInstructions ?? undefined) : undefined,
      });
    }

    const shouldAutoRejectOthers =
      kind === "claim"
        ? status === "claimed" || status === "returned"
        : status === "returned";

    if (shouldAutoRejectOthers) {
      const autoRejectReason =
        kind === "claim"
          ? "This item has already been claimed by its verified owner."
          : "This lost item has already been returned to its owner.";
      const { rows: rejectedRequests } = await client.query<{
        id: string;
        user_id: string;
        received_by_osa: boolean;
        published_item_id: string | null;
        claimant_title: string | null;
        primary_color: string | null;
        building: string | null;
        date_lost: Date | string | null;
        time_lost: string | null;
        location_lost: string | null;
        details: string | null;
        important_details: string | null;
        evidence: string | null;
      }>(
        `UPDATE request
         SET status = 'rejected',
             rejection_reason = $4
         WHERE item_id = $1
           AND kind = $2
           AND status = 'pending'
           AND id <> $3
         RETURNING id, user_id, received_by_osa, published_item_id,
                   claimant_title, primary_color, building, date_lost,
                   time_lost, location_lost, details, important_details,
                   evidence`,
        [current.item_id, kind, id, autoRejectReason],
      );
      for (const rejected of rejectedRequests) {
        if (kind === "return" && !rejected.published_item_id) {
          const publishedName =
            rejected.claimant_title?.trim() || current.item_name;
          const publishedDescription =
            rejected.details?.trim() ||
            "Found item submitted via return request.";
          const publishedDate =
            toDateOnly(rejected.date_lost) ??
            new Date().toISOString().slice(0, 10);
          const created = await createItemWithClient(client, {
            reporterId: rejected.user_id,
            reportType: "found",
            name: publishedName,
            description: publishedDescription,
            itemDate: publishedDate,
            itemTime: rejected.time_lost?.slice(0, 5) ?? undefined,
            categoryId: current.category_id,
            customCategory: current.custom_category,
            color: rejected.primary_color ?? undefined,
            building: rejected.building ?? undefined,
            location: rejected.location_lost?.trim() || undefined,
            importantDetails: rejected.important_details ?? undefined,
            images: parseEvidence(rejected.evidence),
            receivedByOsa: Boolean(rejected.received_by_osa),
          });
          await client.query(
            "UPDATE request SET published_item_id = $2 WHERE id = $1",
            [rejected.id, created.id],
          );
          autoPublishedItemIds.push(created.id);

          await createRequestStatusNotification(client, {
            requestId: rejected.id,
            itemId: created.id,
            itemName: current.item_name,
            kind,
            status: "rejected",
            requesterId: rejected.user_id,
            itemOwnerId: current.item_owner_id,
            reason:
              "This lost item has already been returned to its owner. Your found report has been automatically posted as a public found item so its rightful owner can claim it.",
          });
          continue;
        }

        await createRequestStatusNotification(client, {
          requestId: rejected.id,
          itemId: current.item_id,
          itemName: current.item_name,
          kind,
          status: "rejected",
          requesterId: rejected.user_id,
          itemOwnerId: current.item_owner_id,
          reason: autoRejectReason,
        });
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  for (const publishedItemId of autoPublishedItemIds) {
    await blurPublishedItemImages(publishedItemId);
  }

  return findClaimById(id, true);
}

export function updateClaimStatusById(
  id: string,
  status: Exclude<ClaimStatus, "pending">,
  rejectionReason?: string,
  approvalInstructions?: string,
  releasedByUserId?: string,
): Promise<Claim | null> {
  return updateRequestStatusById(
    "claim",
    id,
    status,
    rejectionReason,
    approvalInstructions,
    releasedByUserId,
  );
}

export function updateReturnStatusById(
  id: string,
  status: Exclude<ClaimStatus, "pending" | "claimed">,
  approvalInstructions?: string,
  releasedByUserId?: string,
): Promise<Claim | null> {
  return updateRequestStatusById(
    "return",
    id,
    status,
    undefined,
    approvalInstructions,
    releasedByUserId,
  );
}

interface CreateRequestInput {
  userId: string;
  itemId: string;
  claimantTitle: string;
  color?: string;
  building?: string;
  dateLost: string;
  timeLost: string;
  location: string;
  details: string;
  importantDetails: string;
  evidence?: string[];
}

type UpdateRequestInput = Omit<CreateRequestInput, "userId" | "itemId">;

async function createRequest(
  kind: "claim" | "return",
  input: CreateRequestInput,
): Promise<Claim | null> {
  const client = await pool.connect();
  let requestId: string;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO request (
         item_id, user_id, kind, status, evidence, claimant_title,
         primary_color, building, date_lost, time_lost, location_lost,
         details, important_details
       )
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        input.itemId,
        input.userId,
        kind,
        JSON.stringify(input.evidence ?? []),
        input.claimantTitle,
        input.color ?? null,
        input.building ?? null,
        input.dateLost,
        input.timeLost,
        input.location,
        input.details,
        input.importantDetails,
      ],
    );
    requestId = rows[0].id;
    await createAdminSubmissionNotifications(client, requestId);
    if (kind === "claim") {
      await createFinderClaimSubmissionNotification(client, requestId);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    // The partial unique index is the final guard against concurrent duplicates.
    if ((error as { code?: string }).code === "23505") return null;
    throw error;
  } finally {
    client.release();
  }

  const request = await findClaimById(requestId);
  if (!request) throw new Error("Created request could not be read back.");
  return request;
}

export function createClaim(input: CreateRequestInput): Promise<Claim | null> {
  return createRequest("claim", input);
}

export function createReturnRequest(
  input: CreateRequestInput,
): Promise<Claim | null> {
  return createRequest("return", input);
}

async function updateRequest(
  kind: "claim" | "return",
  userId: string,
  requestId: string,
  input: UpdateRequestInput,
): Promise<Claim | null> {
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE request
     SET evidence = $1, claimant_title = $2, primary_color = $3, building = $4,
         date_lost = $5, time_lost = $6, location_lost = $7, details = $8,
         important_details = $9
     WHERE id = $10 AND user_id = $11 AND kind = $12 AND status = 'pending'
       AND ($12 <> 'return' OR received_by_osa = FALSE)
     RETURNING id`,
    [
      JSON.stringify(input.evidence ?? []),
      input.claimantTitle,
      input.color ?? null,
      input.building ?? null,
      input.dateLost,
      input.timeLost,
      input.location,
      input.details,
      input.importantDetails,
      requestId,
      userId,
      kind,
    ],
  );
  return rows[0] ? findClaimById(rows[0].id, kind === "return") : null;
}

async function deleteRequest(
  kind: "claim" | "return",
  userId: string,
  requestId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM request
     WHERE id = $1 AND user_id = $2 AND kind = $3 AND status = 'pending'
       AND ($3 <> 'return' OR received_by_osa = FALSE)`,
    [requestId, userId, kind],
  );
  return rowCount === 1;
}

export function updateClaim(
  userId: string,
  requestId: string,
  input: UpdateRequestInput,
): Promise<Claim | null> {
  return updateRequest("claim", userId, requestId, input);
}

export function updateReturnRequest(
  userId: string,
  requestId: string,
  input: UpdateRequestInput,
): Promise<Claim | null> {
  return updateRequest("return", userId, requestId, input);
}

export function deleteClaim(userId: string, requestId: string): Promise<boolean> {
  return deleteRequest("claim", userId, requestId);
}

export function deleteReturnRequest(
  userId: string,
  requestId: string,
): Promise<boolean> {
  return deleteRequest("return", userId, requestId);
}

export interface WalkInSchoolUserOption {
  id: string;
  name: string;
  email: string;
  schoolId: string | null;
}

/** Checks whether an active school_user account exists with the exact School ID. */
export async function findActiveSchoolUserBySchoolId(
  schoolId: string,
): Promise<{ id: string } | null> {
  const trimmed = schoolId.trim();
  if (!trimmed) return null;
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id
     FROM "user"
     WHERE role = 'school_user'
       AND is_active = TRUE
       AND LOWER(TRIM(COALESCE(school_id, ''))) = LOWER($1)
     LIMIT 1`,
    [trimmed],
  );
  return rows[0] ?? null;
}

/** Searches active school_user accounts for Staff/Admin walk-in claim attribution. */
export async function searchActiveSchoolUsers(
  search: string,
  limit = 20,
): Promise<WalkInSchoolUserOption[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const trimmed = search.trim().toLowerCase();
  const params: unknown[] = [];
  let searchClause = "";
  if (trimmed) {
    params.push(`%${trimmed}%`);
    searchClause = `AND (
      LOWER(first_name || ' ' || last_name) LIKE $1
      OR LOWER(email) LIKE $1
      OR LOWER(COALESCE(school_id, '')) LIKE $1
    )`;
  }
  params.push(safeLimit);
  const { rows } = await pool.query<{
    id: string;
    name: string;
    email: string;
    school_id: string | null;
  }>(
    `SELECT id, first_name || ' ' || last_name AS name, email, school_id
     FROM "user"
     WHERE role = 'school_user'
       AND is_active = TRUE
       ${searchClause}
     ORDER BY first_name ASC, last_name ASC
     LIMIT $${params.length}`,
    params,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    schoolId: row.school_id,
  }));
}

export class WalkInClaimError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "WalkInClaimError";
  }
}

export type CreateWalkInClaimRepoInput =
  | {
      itemId: string;
      releasedByUserId: string;
      mode: "account";
      userId: string;
      notes?: string;
    }
  | {
      itemId: string;
      releasedByUserId: string;
      mode: "guest";
      fullName: string;
      schoolId: string;
      contact?: string;
      notes?: string;
    };

/**
 * Records and immediately completes a walk-in claim at the OSA desk for a Found
 * item. Supports both registered School Users and unregistered walk-in claimants.
 */
export async function createWalkInClaim(
  input: CreateWalkInClaimRepoInput,
): Promise<Claim> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: itemRows } = await client.query<{
      id: string;
      name: string;
      report_type: "lost" | "found";
      received_by_osa: boolean;
      reporter_id: string;
    }>(
      `SELECT i.id, i.name, r.report_type, i.received_by_osa, r.user_id AS reporter_id
       FROM item i
       JOIN report r ON r.id = i.report_id
       WHERE i.id = $1
       FOR UPDATE OF i`,
      [input.itemId],
    );
    const item = itemRows[0];
    if (!item) {
      throw new WalkInClaimError(404, "Item not found.");
    }
    if (item.report_type !== "found") {
      throw new WalkInClaimError(
        409,
        "Walk-in claims are only available for found items.",
      );
    }
    if (!item.received_by_osa) {
      throw new PhysicalItemNotReceivedError();
    }

    const { rows: existingRequests } = await client.query<{
      id: string;
      status: ClaimStatus;
    }>(
      `SELECT id, status
       FROM request
       WHERE item_id = $1
         AND kind = 'claim'
         AND status IN ('approved', 'claimed', 'returned')
       LIMIT 1`,
      [input.itemId],
    );
    if (existingRequests[0]) {
      if (existingRequests[0].status === "approved") {
        throw new AnotherClaimAlreadyApprovedError("claim");
      }
      throw new WalkInClaimError(
        409,
        "This item has already been claimed or returned.",
      );
    }

    let linkedUserId: string | null = null;
    if (input.mode === "account") {
      const { rows: userRows } = await client.query<{
        id: string;
        role: string;
        is_active: boolean;
      }>(
        `SELECT id, role, is_active FROM "user" WHERE id = $1 LIMIT 1`,
        [input.userId],
      );
      if (!userRows[0] || !userRows[0].is_active || userRows[0].role !== "school_user") {
        throw new WalkInClaimError(
          400,
          "Selected user must be an active school user account.",
        );
      }
      linkedUserId = userRows[0].id;
    }

    // Reject any pending online claims on this item BEFORE inserting the walk-in
    // claim so a student who already filed a pending claim and then walked into
    // OSA does not collide with idx_request_claim_unique.
    const { rows: rejectedPending } = await client.query<{
      id: string;
      user_id: string | null;
    }>(
      `UPDATE request
       SET status = 'rejected',
           rejection_reason = CASE
             WHEN $2::uuid IS NOT NULL AND user_id = $2::uuid
               THEN 'Completed via walk-in claim at OSA.'
             ELSE 'This item has already been claimed by another user.'
           END,
           approval_instructions = NULL
       WHERE item_id = $1
         AND kind = 'claim'
         AND status = 'pending'
       RETURNING id, user_id`,
      [input.itemId, linkedUserId],
    );

    const { rows: insertedRows } = await client.query<{ id: string }>(
      `INSERT INTO request (
         item_id, user_id, kind, status, details,
         is_walkin, walkin_name, walkin_school_id, walkin_contact,
         released_by, released_at
       ) VALUES ($1, $2, 'claim', 'claimed', $3, TRUE, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        input.itemId,
        linkedUserId,
        input.notes?.trim() || "Walk-in claim verified and released at OSA desk.",
        input.mode === "guest" ? input.fullName.trim() : null,
        input.mode === "guest" ? input.schoolId.trim() : null,
        input.mode === "guest" ? (input.contact?.trim() || null) : null,
        input.releasedByUserId,
      ],
    );
    const createdId = insertedRows[0].id;

    for (const competing of rejectedPending) {
      if (!competing.user_id || competing.user_id === linkedUserId) continue;
      await createRequestStatusNotification(client, {
        requestId: competing.id,
        itemId: input.itemId,
        itemName: item.name,
        kind: "claim",
        status: "rejected",
        requesterId: competing.user_id,
        itemOwnerId: item.reporter_id,
        reason: "This item has already been claimed by another user.",
      });
    }

    await createClaimedNotifications(client, {
      requestId: createdId,
      itemId: input.itemId,
      itemName: item.name,
      requesterId: linkedUserId,
      itemOwnerId: item.reporter_id,
      status: "claimed",
    });

    const { rows: fullRows } = await client.query<ClaimRow>(
      `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN} WHERE rq.id = $1 LIMIT 1`,
      [createdId],
    );

    await client.query("COMMIT");
    return toClaim(fullRows[0], true);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export class WalkInReturnError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "WalkInReturnError";
    this.status = status;
  }
}

type WalkInReturnCommonFields = {
  itemId: string;
  claimantTitle: string;
  color?: string;
  building?: string;
  dateLost: string;
  timeLost: string;
  location: string;
  details: string;
  importantDetails: string;
  approvalInstructions: string;
};

export type CreateWalkInReturnRepoInput =
  | (WalkInReturnCommonFields & {
      mode: "account";
      userId: string;
    })
  | (WalkInReturnCommonFields & {
      mode: "guest";
      fullName: string;
      schoolId?: string;
      contact?: string;
    });

/**
 * Records a walk-in return at the OSA desk for a Lost item.
 * Marks the item as received by OSA and immediately approves the return so the
 * Lost item owner receives a Pickup QR Pass to claim it at OSA.
 */
export async function createWalkInReturn(
  input: CreateWalkInReturnRepoInput,
): Promise<Claim> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: itemRows } = await client.query<{
      id: string;
      name: string;
      report_type: "lost" | "found";
      reporter_id: string;
    }>(
      `SELECT i.id, i.name, r.report_type, r.user_id AS reporter_id
       FROM item i
       JOIN report r ON r.id = i.report_id
       WHERE i.id = $1
       FOR UPDATE OF i`,
      [input.itemId],
    );
    const item = itemRows[0];
    if (!item) {
      throw new WalkInReturnError(404, "Item not found.");
    }
    if (item.report_type !== "lost") {
      throw new WalkInReturnError(
        409,
        "Walk-in returns are only available for lost items.",
      );
    }

    const { rows: existingReturns } = await client.query<{
      id: string;
      status: ClaimStatus;
    }>(
      `SELECT id, status
       FROM request
       WHERE item_id = $1
         AND kind = 'return'
         AND status IN ('approved', 'returned')
       LIMIT 1`,
      [input.itemId],
    );
    if (existingReturns[0]) {
      if (existingReturns[0].status === "approved") {
        throw new AnotherClaimAlreadyApprovedError("return");
      }
      throw new WalkInReturnError(
        409,
        "This lost item has already been returned.",
      );
    }

    let linkedUserId: string | null = null;
    if (input.mode === "account") {
      const { rows: userRows } = await client.query<{
        id: string;
        role: string;
        is_active: boolean;
      }>(
        `SELECT id, role, is_active FROM "user" WHERE id = $1 LIMIT 1`,
        [input.userId],
      );
      if (
        !userRows[0] ||
        !userRows[0].is_active ||
        userRows[0].role !== "school_user"
      ) {
        throw new WalkInReturnError(
          400,
          "Selected user must be an active school user account.",
        );
      }
      if (userRows[0].id === item.reporter_id) {
        throw new WalkInReturnError(
          400,
          "The finder cannot be the same user who reported the lost item.",
        );
      }
      linkedUserId = userRows[0].id;

      // Supersede any pending online return from this same finder on this item
      // so inserting the approved walk-in return does not collide with unique indexes.
      await client.query(
        `UPDATE request
         SET status = 'rejected',
             rejection_reason = 'Completed via walk-in return at OSA.',
             approval_instructions = NULL
         WHERE item_id = $1
           AND kind = 'return'
           AND user_id = $2
           AND status = 'pending'`,
        [input.itemId, linkedUserId],
      );
    }

    const trimmedInstructions = input.approvalInstructions.trim();

    const { rows: insertedRows } = await client.query<{ id: string }>(
      `INSERT INTO request (
         item_id, user_id, kind, status,
         received_by_osa, is_walkin,
         walkin_name, walkin_school_id, walkin_contact,
         claimant_title, primary_color, building,
         date_lost, time_lost, location_lost,
         details, important_details, approval_instructions
       ) VALUES (
         $1, $2, 'return', 'approved',
         TRUE, TRUE,
         $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11,
         $12, $13, $14
       )
       RETURNING id`,
      [
        input.itemId,
        linkedUserId,
        input.mode === "guest" ? input.fullName.trim() : null,
        input.mode === "guest" ? (input.schoolId?.trim() || null) : null,
        input.mode === "guest" ? (input.contact?.trim() || null) : null,
        input.claimantTitle.trim(),
        input.color?.trim() || null,
        input.building?.trim() || null,
        input.dateLost,
        input.timeLost,
        input.location.trim(),
        input.details.trim(),
        input.importantDetails.trim(),
        trimmedInstructions,
      ],
    );
    const createdId = insertedRows[0].id;

    await createRequestStatusNotification(client, {
      requestId: createdId,
      itemId: input.itemId,
      itemName: item.name,
      kind: "return",
      status: "approved",
      requesterId: linkedUserId,
      itemOwnerId: item.reporter_id,
      instructions: trimmedInstructions ?? undefined,
    });

    const { rows: fullRows } = await client.query<ClaimRow>(
      `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN} WHERE rq.id = $1 LIMIT 1`,
      [createdId],
    );

    await client.query("COMMIT");
    return toClaim(fullRows[0], true);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
