import { Router } from "express";
import {
  deleteMyReturn,
  getAllReturns,
  getBlurredReturnEvidenceImage,
  getItemReturns,
  getMyReturns,
  publishRejectedReturnItem,
  remindReturnFinder,
  submitReturn,
  updateAdminReturnOsaReceipt,
  updateAdminReturnStatus,
  updateMyReturn,
} from "../controllers/returns.controller";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/authorize";

const router = Router();

// Public image streaming endpoint (only serves blurred evidence of approved/returned returns)
router.get("/:id/evidence/blurred", getBlurredReturnEvidenceImage);

router.use(authenticate);

// Admin returns workspace
router.get("/admin", requireAdmin, getAllReturns);
router.post("/admin/:id/publish", requireAdmin, publishRejectedReturnItem);
router.post("/admin/:id/remind-finder", requireAdmin, remindReturnFinder);
router.patch("/admin/:id/status", requireAdmin, updateAdminReturnStatus);
router.patch("/admin/:id/osa-receipt", requireAdmin, updateAdminReturnOsaReceipt);

router.get("/item/:itemId", getItemReturns);
router.get("/", getMyReturns);
router.post("/", submitReturn);
router.patch("/:id", updateMyReturn);
router.delete("/:id", deleteMyReturn);

export default router;
