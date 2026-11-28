import type { Request, Response } from "express";
import { z } from "zod";
import {
  AnotherClaimAlreadyApprovedError,
  countRejectedReturnsForUserAndItem,
  createReturnRequest,
  createWalkInReturn,
  deleteReturnRequest,
  findClaimableItem,
  findItemEventTiming,
  findReturnEvidenceImageForBlur,
  findReturnForUserById,
  findReturnForUserAndItem,
  listAllReturnsPage,
  listReturnsByItem,
  listReturnsByUser,
  PhysicalItemNotReceivedError,
  publishRejectedReturn,
  sendReturnFinderReminder,
  updateReturnRequest,
  updateReturnOsaReceipt,
  updateReturnStatusById,
  WalkInReturnError,
} from "../repositories/request.repository";
import { CannotRevokeOsaReceiptError, findItemOwner } from "../repositories/item.repository";
import { recordAuditLog } from "../repositories/audit-log.repository";
import { createClaimSchema, updateClaimSchema } from "../validation/claims";
import { parsePagination } from "../validation/pagination";
import { UUID_RE } from "../validation/dates";
import {
  createWalkInReturnSchema,
  validateReturnTarget,
} from "../validation/returns";
import { isLostAfterFound } from "./claims.controller";
import { isTrustedImageUrl } from "./items.controller";
import { fetchRemoteImageBuffer, generateBlurredImage } from "../utils/image-blur";

const MAX_REJECTED_RETURN_ATTEMPTS = 2;

function zodError(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    message: "Validation failed",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function requestIdParam(req: Request): string | null {
  return typeof req.params.id === "string" && UUID_RE.test(req.params.id)
    ? req.params.id
    : null;
}

const adminReturnStatusSchema = z
  .object({
    status: z.enum(["approved", "rejected", "returned"]),
    instructions: z
      .string()
      .trim()
      .max(500, "Approval message must be at most 500 characters.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.status === "approved" &&
      (!data.instructions || data.instructions.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["instructions"],
        message: "Please provide a message for the lost-item owner before approving.",
      });
    }
  });
const adminOsaReceiptSchema = z.object({
  receivedByOsa: z.boolean(),
});

/** POST /api/returns — report a found item on someone else's lost post. */
export async function submitReturn(req: Request, res: Response): Promise<void> {
  const parsed = createClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }

  const item = await findClaimableItem(parsed.data.itemId);
  const targetError = validateReturnTarget(item, req.user!.sub);
  if (targetError) {
    res.status(targetError.status).json({ message: targetError.message });
    return;
  }

  if (
    item &&
    isLostAfterFound(
      item.itemDate,
      item.itemTime,
      parsed.data.dateLost,
      parsed.data.timeLost,
    )
  ) {
    res.status(400).json({
      message:
        "The date and time found cannot be earlier than when the item was reported lost.",
    });
    return;
  }

  const existingReturn = await findReturnForUserAndItem(
    req.user!.sub,
    parsed.data.itemId,
  );
  if (existingReturn) {
    res.status(409).json({
      message: "You already submitted a found report for this item.",
    });
    return;
  }

  const rejectedCount = await countRejectedReturnsForUserAndItem(
    req.user!.sub,
    parsed.data.itemId,
  );
  if (rejectedCount >= MAX_REJECTED_RETURN_ATTEMPTS) {
    res.status(409).json({
      message:
        "You have reached the maximum number of return attempts for this item.",
    });
    return;
  }

  const returnRequest = await createReturnRequest({
    userId: req.user!.sub,
    ...parsed.data,
  });
  if (!returnRequest) {
    res.status(409).json({
      message: "You already submitted a found report for this item.",
    });
    return;
  }
  res.status(201).json({ message: "Found report submitted.", returnRequest });
}

/** GET /api/returns — the signed-in user's own found reports. */
export async function getMyReturns(req: Request, res: Response): Promise<void> {
  const returns = await listReturnsByUser(req.user!.sub);
  res.json({ returns, count: returns.length });
}

/** GET /api/returns/admin — every return request (admin+). */
export async function getAllReturns(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query, { limit: 500, maxLimit: 500 });
  const { items: returns, hasMore } = await listAllReturnsPage(pagination);
  res.json({ returns, count: returns.length, hasMore });
}

/** POST /api/returns/admin/:id/publish — publish rejected found evidence publicly. */
export async function publishRejectedReturnItem(
  req: Request,
  res: Response,
): Promise<void> {
  const requestId = requestIdParam(req);
  if (!requestId || !UUID_RE.test(requestId)) {
    res.status(400).json({ message: "Invalid return request ID." });
    return;
  }
  const result = await publishRejectedReturn(requestId, req.user!.sub);
  if (result.status === "not_found") {
    res.status(404).json({ message: "Return request not found." });
    return;
  }
  if (result.status === "not_rejected") {
    res.status(409).json({
      message: "Only rejected return requests can be published as found items.",
    });
    return;
  }
  if (result.status === "not_received") {
    res.status(409).json({
      message:
        "The physical item must be marked received by OSA before publishing it as a found item.",
    });
    return;
  }
  if (result.status === "invalid_data") {
    res.status(409).json({ message: result.message });
    return;
  }
  if (result.status === "published") {
    await recordAuditLog({
      actorId: req.user!.sub,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: "published",
      entityType: "return",
      entityId: requestId,
      summary: `Published rejected return request ${requestId} as found item ${result.itemId}`,
    });
  }
  res.status(result.status === "published" ? 201 : 200).json({
    message:
      result.status === "published"
        ? "Found item published."
        : "This return request was already published.",
    itemId: result.itemId,
    alreadyPublished: result.status === "already_published",
  });
}

/** PATCH /api/returns/admin/:id/status — approve, reject, claim, or return (admin+). */
export async function updateAdminReturnStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = adminReturnStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const requestId = requestIdParam(req);
  if (!requestId) {
    res.status(400).json({ message: "Invalid return request ID." });
    return;
  }
  let returnRequest;
  try {
    returnRequest = await updateReturnStatusById(
      requestId,
      parsed.data.status,
      parsed.data.instructions,
      req.user!.sub,
    );
  } catch (error) {
    if (
      error instanceof PhysicalItemNotReceivedError ||
      error instanceof AnotherClaimAlreadyApprovedError
    ) {
      res.status(409).json({ message: error.message });
      return;
    }
    throw error;
  }
  if (!returnRequest) {
    res.status(409).json({
      message: "This return request is no longer waiting for that decision.",
    });
    return;
  }
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: parsed.data.status,
    entityType: "return",
    entityId: returnRequest.id,
    summary: `Updated return request for "${returnRequest.item}" (${returnRequest.claimant}) to ${parsed.data.status}`,
  });
  res.json({ message: "Return status updated.", returnRequest });
}

/** PATCH /api/returns/admin/:id/osa-receipt — update found-item custody. */
export async function updateAdminReturnOsaReceipt(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = adminOsaReceiptSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const requestId = requestIdParam(req);
  if (!requestId) {
    res.status(400).json({ message: "Invalid return request ID." });
    return;
  }
  let returnRequest;
  try {
    returnRequest = await updateReturnOsaReceipt(
      requestId,
      parsed.data.receivedByOsa,
    );
  } catch (err) {
    if (err instanceof CannotRevokeOsaReceiptError) {
      res.status(409).json({ message: err.message });
      return;
    }
    throw err;
  }
  if (!returnRequest) {
    res.status(404).json({ message: "Found report not found." });
    return;
  }
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: "updated",
    entityType: "return",
    entityId: returnRequest.id,
    summary: `Marked returned item "${returnRequest.item}" as ${parsed.data.receivedByOsa ? "received by OSA" : "awaiting OSA"}`,
  });
  res.json({ message: "Physical item status updated.", returnRequest });
}

/** POST /api/returns/admin/:id/remind-finder — nudge the finder to surrender the item to OSA (3-hour cooldown). */
export async function remindReturnFinder(
  req: Request,
  res: Response,
): Promise<void> {
  const requestId = requestIdParam(req);
  if (!requestId) {
    res.status(400).json({ message: "Invalid return request ID." });
    return;
  }
  const result = await sendReturnFinderReminder(requestId);
  if (result.status === "not_found") {
    res.status(404).json({ message: "Return request not found." });
    return;
  }
  if (result.status === "not_pending") {
    res.status(409).json({
      message: "Only pending return requests can send a surrender reminder.",
    });
    return;
  }
  if (result.status === "already_received") {
    res.status(409).json({
      message: "This physical item has already been marked as received by OSA.",
    });
    return;
  }
  if (result.status === "inactive_finder") {
    res.status(409).json({
      message: "The finder account is no longer active.",
    });
    return;
  }
  if (result.status === "cooldown") {
    res.status(429).json({
      message:
        "A surrender reminder was already sent recently. You can send another reminder every 3 hours.",
      nextAllowedAt: result.nextAllowedAt,
    });
    return;
  }
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: "updated",
    entityType: "return",
    entityId: requestId,
    summary: `Sent OSA surrender reminder to finder for "${result.itemName}"`,
  });
  res.json({
    message: "Surrender reminder sent to the finder.",
    lastFinderReminderAt: result.lastFinderReminderAt,
  });
}

/** PATCH /api/returns/:id — edit the signed-in user's pending found report. */
export async function updateMyReturn(req: Request, res: Response): Promise<void> {
  const parsed = updateClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  if (!parsed.data.evidence || parsed.data.evidence.length === 0) {
    res.status(400).json({ message: "Please attach at least 1 photo for your found report." });
    return;
  }

  const requestId = requestIdParam(req);
  if (!requestId) {
    res.status(400).json({ message: "Invalid found report ID." });
    return;
  }
  const existing = await findReturnForUserById(req.user!.sub, requestId);
  if (!existing) {
    res.status(404).json({ message: "Found report not found." });
    return;
  }
  if (existing.status !== "pending") {
    res.status(409).json({ message: "Only pending found reports can be edited." });
    return;
  }
  if (existing.receivedByOsa) {
    res.status(409).json({
      message:
        "This found report can no longer be edited because the physical item has already been received by OSA.",
    });
    return;
  }

  const timing = await findItemEventTiming(existing.itemId);
  if (
    timing &&
    isLostAfterFound(
      timing.itemDate,
      timing.itemTime,
      parsed.data.dateLost,
      parsed.data.timeLost,
    )
  ) {
    res.status(400).json({
      message:
        "The date and time found cannot be earlier than when the item was reported lost.",
    });
    return;
  }

  const returnRequest = await updateReturnRequest(
    req.user!.sub,
    requestId,
    parsed.data,
  );
  if (!returnRequest) {
    res.status(409).json({ message: "This found report is no longer pending." });
    return;
  }
  res.json({ message: "Found report updated.", returnRequest });
}

/** DELETE /api/returns/:id — delete the signed-in user's pending found report. */
export async function deleteMyReturn(req: Request, res: Response): Promise<void> {
  const requestId = requestIdParam(req);
  if (!requestId) {
    res.status(400).json({ message: "Invalid found report ID." });
    return;
  }
  const existing = await findReturnForUserById(req.user!.sub, requestId);
  if (!existing) {
    res.status(404).json({ message: "Found report not found." });
    return;
  }
  if (existing.status !== "pending") {
    res.status(409).json({ message: "Only pending found reports can be deleted." });
    return;
  }
  if (existing.receivedByOsa) {
    res.status(409).json({
      message:
        "This found report can no longer be deleted because the physical item has already been received by OSA.",
    });
    return;
  }

  const deleted = await deleteReturnRequest(req.user!.sub, requestId);
  if (!deleted) {
    res.status(409).json({ message: "This found report is no longer pending." });
    return;
  }
  res.json({ message: "Found report deleted." });
}

/** GET /api/returns/item/:itemId — return requests for a specific item (owner or admin+). */
export async function getItemReturns(req: Request, res: Response): Promise<void> {
  const itemId = req.params.itemId;
  if (typeof itemId !== "string" || !UUID_RE.test(itemId)) {
    res.status(400).json({ message: "Invalid item ID." });
    return;
  }
  const owner = await findItemOwner(itemId);
  if (!owner) {
    res.status(404).json({ message: "Item not found." });
    return;
  }
  const isOwner = owner.reporterId === req.user!.sub;
  const isAdmin = req.user!.role === "staff" || req.user!.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403).json({
      message: "You are not authorized to view responses for this item.",
    });
    return;
  }
  const returns = await listReturnsByItem(itemId, isAdmin);
  res.json({ returns, count: returns.length });
}

/**
 * POST /api/returns/admin/walk-in — Record a walk-in return at the OSA desk
 * for a Lost item (supports both registered school users and walk-in guests).
 */
export async function submitWalkInReturn(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = createWalkInReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }

  if (parsed.data.evidence?.some((url) => !isTrustedImageUrl(url))) {
    res.status(400).json({
      message: "Evidence images must be uploaded through FoundIt.",
    });
    return;
  }

  const timing = await findItemEventTiming(parsed.data.itemId);
  if (
    timing &&
    isLostAfterFound(
      timing.itemDate,
      timing.itemTime,
      parsed.data.dateLost,
      parsed.data.timeLost,
    )
  ) {
    res.status(400).json({
      message:
        "The date and time found cannot be earlier than when the item was reported lost.",
    });
    return;
  }

  try {
    const returnRequest = await createWalkInReturn({
      ...parsed.data,
      recordedByUserId: req.user!.sub,
    });
    await recordAuditLog({
      actorId: req.user!.sub,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: "approved",
      entityType: "return",
      entityId: returnRequest.id,
      summary:
        parsed.data.mode === "account"
          ? `Recorded walk-in return for "${returnRequest.item}" from ${returnRequest.claimant} (registered user) and approved for owner pickup.`
          : `Recorded walk-in return for "${returnRequest.item}" from ${returnRequest.claimant} (no account) and approved for owner pickup.`,
    });
    res.status(201).json({
      message:
        "Walk-in return recorded. The lost item owner has been notified with a pickup QR pass.",
      returnRequest,
    });
  } catch (error) {
    if (error instanceof AnotherClaimAlreadyApprovedError) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (error instanceof WalkInReturnError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    throw error;
  }
}

/**
 * GET /api/returns/:id/evidence/blurred — Streams a server-blurred version of
 * a return request's evidence image for the lost-item owner.
 */
export async function getBlurredReturnEvidenceImage(
  req: Request,
  res: Response,
): Promise<void> {
  const requestId = requestIdParam(req);
  if (!requestId) {
    res.status(400).json({ message: "Invalid return request ID." });
    return;
  }

  const rawIndex =
    typeof req.query.index === "string"
      ? Number.parseInt(req.query.index, 10)
      : 0;
  const imageIndex = Number.isFinite(rawIndex) && rawIndex >= 0 ? rawIndex : 0;

  const imageUrl = await findReturnEvidenceImageForBlur(requestId, imageIndex);
  if (!imageUrl) {
    res.status(404).json({ message: "Image not found." });
    return;
  }

  if (!imageUrl.startsWith("https://") || !isTrustedImageUrl(imageUrl)) {
    res.status(400).json({ message: "Untrusted source image URL." });
    return;
  }

  try {
    const remoteBuffer = await fetchRemoteImageBuffer(imageUrl);
    const blurredBuffer = await generateBlurredImage(remoteBuffer);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800",
    );
    res.send(blurredBuffer);
  } catch (err) {
    console.error("[Return Blur] Error generating blurred evidence image:", err);
    res.status(500).json({ message: "Failed to process blurred image." });
  }
}
