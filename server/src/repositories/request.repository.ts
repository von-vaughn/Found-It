import { pool } from "../config/db";
import type { Claim, ClaimStatus } from "../types/claims";

interface ClaimRow {
  id: string;
  item_id: string;
  item_name: string;
  claimant: string;
  email: string;
  date_lost: Date | string | null;
  time_lost: string | null;
  location_lost: string | null;
  details: string | null;
  important_details: string | null;
  evidence: string | null;
  claimant_title: string | null;
  primary_color: string | null;
  building: string | null;
  status: ClaimStatus;
  created_at: Date | string;
}

const CLAIM_COLUMNS = `
  rq.id, rq.item_id, i.name AS item_name,
  u.first_name || ' ' || u.last_name AS claimant, u.email,
  rq.date_lost, rq.time_lost, rq.location_lost, rq.details,
  rq.important_details, rq.evidence, rq.claimant_title,
  rq.primary_color, rq.building, rq.status, rq.created_at
`;
const CLAIM_JOIN = `
  FROM request rq
  JOIN item i ON i.id = rq.item_id
  JOIN "user" u ON u.id = rq.user_id
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

function toClaim(row: ClaimRow): Claim {
  return {
    id: row.id,
    itemId: row.item_id,
    item: row.item_name,
    claimant: row.claimant,
    email: row.email,
    dateLost: toDateOnly(row.date_lost),
    timeLost: row.time_lost ? row.time_lost.slice(0, 5) : null,
    location: row.location_lost,
    details: row.details,
    importantDetails: row.important_details,
    evidence: parseEvidence(row.evidence),
    claimantTitle: row.claimant_title,
    color: row.primary_color,
    building: row.building,
    status: row.status,
    submitted: new Date(row.created_at).toISOString(),
  };
}

export async function findClaimableItem(
  itemId: string,
): Promise<{ reporterId: string; reportType: "lost" | "found" } | null> {
  const { rows } = await pool.query<{
    reporter_id: string;
    report_type: "lost" | "found";
  }>(
    `SELECT r.user_id AS reporter_id, r.report_type
     FROM item i
     JOIN report r ON r.id = i.report_id
     WHERE i.id = $1
       AND NOT EXISTS (
         SELECT 1 FROM request approved_claim
         WHERE approved_claim.item_id = i.id
           AND approved_claim.kind = 'claim'
           AND approved_claim.status IN ('approved', 'claimed', 'returned')
       )
     LIMIT 1`,
    [itemId],
  );
  return rows[0]
    ? { reporterId: rows[0].reporter_id, reportType: rows[0].report_type }
    : null;
}

export async function findClaimById(id: string): Promise<Claim | null> {
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN} WHERE rq.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? toClaim(rows[0]) : null;
}

async function findRequestForUserAndItem(
  userId: string,
  itemId: string,
  kind: "claim" | "return",
): Promise<Claim | null> {
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN}
     WHERE rq.user_id = $1 AND rq.item_id = $2 AND rq.kind = $3
     LIMIT 1`,
    [userId, itemId, kind],
  );
  return rows[0] ? toClaim(rows[0]) : null;
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
  return rows[0] ? toClaim(rows[0]) : null;
}

export function findClaimForUserAndItem(
  userId: string,
  itemId: string,
): Promise<Claim | null> {
  return findRequestForUserAndItem(userId, itemId, "claim");
}

export function findReturnForUserAndItem(
  userId: string,
  itemId: string,
): Promise<Claim | null> {
  return findRequestForUserAndItem(userId, itemId, "return");
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
  return rows.map(toClaim);
}

export function listClaimsByUser(userId: string): Promise<Claim[]> {
  return listRequestsByUser(userId, "claim");
}

export function listReturnsByUser(userId: string): Promise<Claim[]> {
  return listRequestsByUser(userId, "return");
}

async function listAllRequests(kind: "claim" | "return"): Promise<Claim[]> {
  const { rows } = await pool.query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS} ${CLAIM_JOIN}
     WHERE rq.kind = $1
     ORDER BY rq.created_at DESC
     LIMIT 500`,
    [kind],
  );
  return rows.map(toClaim);
}

/** Every ownership claim, for the admin claims workspace. */
export function listAllClaims(): Promise<Claim[]> {
  return listAllRequests("claim");
}

/** Every found report filed on a lost post, for the admin returns workspace. */
export function listAllReturns(): Promise<Claim[]> {
  return listAllRequests("return");
}

/** Admin decisions require the request's current status to match this predecessor. */
const CLAIM_STATUS_PREDECESSOR: Record<ClaimStatus, ClaimStatus> = {
  pending: "approved",
  approved: "pending",
  rejected: "pending",
  claimed: "approved",
  returned: "approved",
};

async function updateRequestStatusById(
  kind: "claim" | "return",
  id: string,
  status: ClaimStatus,
): Promise<Claim | null> {
  const { rowCount } = await pool.query(
    `UPDATE request SET status = $2
     WHERE id = $1 AND kind = $3 AND status = $4`,
    [id, status, kind, CLAIM_STATUS_PREDECESSOR[status]],
  );
  return rowCount === 1 ? findClaimById(id) : null;
}

export function updateClaimStatusById(
  id: string,
  status: Exclude<ClaimStatus, "pending">,
): Promise<Claim | null> {
  return updateRequestStatusById("claim", id, status);
}

export function updateReturnStatusById(
  id: string,
  status: Exclude<ClaimStatus, "claimed">,
): Promise<Claim | null> {
  return updateRequestStatusById("return", id, status);
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
  const result = await pool
    .query<{ id: string }>(
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
    )
    .catch((error: unknown) => {
      // The partial unique index is the final guard against a concurrent duplicate.
      if ((error as { code?: string }).code === "23505") return null;
      throw error;
    });

  if (!result) return null;

  const request = await findClaimById(result.rows[0].id);
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
  return rows[0] ? findClaimById(rows[0].id) : null;
}

async function deleteRequest(
  kind: "claim" | "return",
  userId: string,
  requestId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM request
     WHERE id = $1 AND user_id = $2 AND kind = $3 AND status = 'pending'`,
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
