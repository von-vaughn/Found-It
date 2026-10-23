import { Router } from "express";
import {
  deleteMyReturn,
  getMyReturns,
  submitReturn,
  updateMyReturn,
} from "../controllers/returns.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", getMyReturns);
router.post("/", submitReturn);
router.patch("/:id", updateMyReturn);
router.delete("/:id", deleteMyReturn);

export default router;
