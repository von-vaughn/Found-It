import type { Request, Response } from "express";
import { z } from "zod";
import {
  createReturnRequest,
  deleteReturnRequest,
  findClaimableItem,
  findReturnForUserById,
  findReturnForUserAndItem,
  listAllReturns,
  listReturnsByItem,
  listReturnsByUser,
  PhysicalItemNotReceivedError,
  publishRejectedReturn,
  updateReturnRequest,
  updateReturnOsaReceipt,
  updateReturnStatusById,
} from "../repositories/request.repository";
import { findItemOwner } from "../repositories/item.repository";
import { createClaimSchema, updateClaimSchema } from "../validation/claims";
import { validateReturnTarget } from "../validation/returns";

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
  return typeof req.params.id === "string" ? req.params.id : null;
}

const adminReturnStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "returned"]),
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
export async function getAllReturns(_req: Request, res: Response): Promise<void> {
  const returns = await listAllReturns();
  res.json({ returns, count: returns.length });
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
  if (result.status === "invalid_data") {
    res.status(409).json({ message: result.message });
    return;
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
    );
  } catch (error) {
    if (error instanceof PhysicalItemNotReceivedError) {
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
  const returnRequest = await updateReturnOsaReceipt(
    requestId,
    parsed.data.receivedByOsa,
  );
  if (!returnRequest) {
    res.status(404).json({ message: "Found report not found." });
    return;
  }
  res.json({ message: "Physical item status updated.", returnRequest });
}

/** PATCH /api/returns/:id — edit the signed-in user's pending found report. */
export async function updateMyReturn(req: Request, res: Response): Promise<void> {
  const parsed = updateClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
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

  const deleted = await deleteReturnRequest(req.user!.sub, requestId);
  if (!deleted) {
    res.status(409).json({ message: "This found report is no longer pending." });
    return;
  }
  res.json({ message: "Found report deleted." });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";
  if (!isOwner && !isAdmin) {
    res.status(403).json({
      message: "You are not authorized to view responses for this item.",
    });
    return;
  }
  const returns = await listReturnsByItem(itemId, isAdmin);
  res.json({ returns, count: returns.length });
}
