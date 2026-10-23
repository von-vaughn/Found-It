import { Router } from "express";
import {
  deleteMyClaim,
  getMyClaims,
  submitClaim,
  updateMyClaim,
} from "../controllers/claims.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", getMyClaims);
router.post("/", submitClaim);
router.patch("/:id", updateMyClaim);
router.delete("/:id", deleteMyClaim);

export default router;
