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
  submitWalkInReturn,
  updateAdminReturnOsaReceipt,
  updateAdminReturnStatus,
  updateMyReturn,
} from "../controllers/returns.controller";
import { authenticate } from "../middleware/authenticate";
import { requireStaff } from "../middleware/authorize";

const router = Router();

// Public image streaming endpoint (only serves blurred evidence of approved/returned returns)
router.get("/:id/evidence/blurred", getBlurredReturnEvidenceImage);

router.use(authenticate);

// Admin returns workspace
router.get("/admin", requireStaff, getAllReturns);
router.post("/admin/walk-in", requireStaff, submitWalkInReturn);
router.post("/admin/:id/publish", requireStaff, publishRejectedReturnItem);
router.post("/admin/:id/remind-finder", requireStaff, remindReturnFinder);
router.patch("/admin/:id/status", requireStaff, updateAdminReturnStatus);
router.patch("/admin/:id/osa-receipt", requireStaff, updateAdminReturnOsaReceipt);

router.get("/item/:itemId", getItemReturns);
router.get("/", getMyReturns);
router.post("/", submitReturn);
router.patch("/:id", updateMyReturn);
router.delete("/:id", deleteMyReturn);

export default router;
