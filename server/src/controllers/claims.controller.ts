import type { Request, Response } from "express";
import { z } from "zod";
import {
  createClaim,
  findClaimableItem,
  findClaimForUserAndItem,
  listClaimsByUser,
} from "../repositories/request.repository";
import { createClaimSchema } from "../validation/claims";

function zodError(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    message: "Validation failed",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

/** POST /api/claims — submit an ownership claim on a found item. */
export async function submitClaim(req: Request, res: Response): Promise<void> {
  const parsed = createClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }

  const item = await findClaimableItem(parsed.data.itemId);
  if (!item) {
    res.status(404).json({ message: "Item not found." });
    return;
  }
  if (item.reportType !== "found") {
    res.status(400).json({ message: "Claims can only be filed on found items." });
    return;
  }
  if (item.reporterId === req.user!.sub) {
    res.status(400).json({ message: "You cannot claim your own report." });
    return;
  }

  const existingClaim = await findClaimForUserAndItem(
    req.user!.sub,
    parsed.data.itemId,
  );
  if (existingClaim) {
    res
      .status(409)
      .json({ message: "You already submitted a claim for this item." });
    return;
  }

  const claim = await createClaim({ userId: req.user!.sub, ...parsed.data });
  if (!claim) {
    res
      .status(409)
      .json({ message: "You already submitted a claim for this item." });
    return;
  }
  res.status(201).json({ message: "Claim request submitted.", claim });
}

/** GET /api/claims — the signed-in user's own claim requests. */
export async function getMyClaims(req: Request, res: Response): Promise<void> {
  const claims = await listClaimsByUser(req.user!.sub);
  res.json({ claims, count: claims.length });
}
