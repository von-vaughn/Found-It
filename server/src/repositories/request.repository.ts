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
