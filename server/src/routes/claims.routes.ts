import { Router } from "express";
import { getMyClaims, submitClaim } from "../controllers/claims.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", getMyClaims);
router.post("/", submitClaim);

export default router;
