import { Router } from "express";
import {
  deleteMyClaim,
  getAllClaims,
  getMyClaims,
  searchClaimantSchoolUsers,
  submitClaim,
  submitWalkInClaim,
  updateAdminClaimStatus,
  updateMyClaim,
} from "../controllers/claims.controller";
import { authenticate } from "../middleware/authenticate";
import { requireStaff } from "../middleware/authorize";

const router = Router();

router.use(authenticate);

// Admin/Staff claim workspace
router.get("/admin", requireStaff, getAllClaims);
router.get("/admin/school-users", requireStaff, searchClaimantSchoolUsers);
router.post("/admin/walk-in", requireStaff, submitWalkInClaim);
router.patch("/admin/:id/status", requireStaff, updateAdminClaimStatus);

router.get("/", getMyClaims);
router.post("/", submitClaim);
router.patch("/:id", updateMyClaim);
router.delete("/:id", deleteMyClaim);

export default router;
