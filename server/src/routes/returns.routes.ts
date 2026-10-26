import { Router } from "express";
import {
  deleteMyReturn,
  getAllReturns,
  getItemReturns,
  getMyReturns,
  submitReturn,
  updateAdminReturnOsaReceipt,
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
router.patch("/admin/:id/osa-receipt", requireAdmin, updateAdminReturnOsaReceipt);

router.get("/item/:itemId", getItemReturns);
router.get("/", getMyReturns);
router.post("/", submitReturn);
router.patch("/:id", updateMyReturn);
router.delete("/:id", deleteMyReturn);

export default router;
