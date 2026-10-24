import { Router } from "express";
import {
  deleteMyClaim,
  getAllClaims,
  getMyClaims,
  submitClaim,
  updateAdminClaimStatus,
  updateMyClaim,
} from "../controllers/claims.controller";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/authorize";

const router = Router();

router.use(authenticate);

// Admin claim workspace
router.get("/admin", requireAdmin, getAllClaims);
router.patch("/admin/:id/status", requireAdmin, updateAdminClaimStatus);

router.get("/", getMyClaims);
router.post("/", submitClaim);
router.patch("/:id", updateMyClaim);
router.delete("/:id", deleteMyClaim);

export default router;
