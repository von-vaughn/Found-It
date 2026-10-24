import { Router } from "express";
import {
  deleteMyReturn,
  getAllReturns,
  getMyReturns,
  submitReturn,
  updateAdminReturnStatus,
  updateMyReturn,
} from "../controllers/returns.controller";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/authorize";

const router = Router();

router.use(authenticate);

// Admin returns workspace
router.get("/admin", requireAdmin, getAllReturns);
router.patch("/admin/:id/status", requireAdmin, updateAdminReturnStatus);

router.get("/", getMyReturns);
router.post("/", submitReturn);
router.patch("/:id", updateMyReturn);
router.delete("/:id", deleteMyReturn);

export default router;
