import { Router } from "express";
import { getMyReturns, submitReturn } from "../controllers/returns.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", getMyReturns);
router.post("/", submitReturn);

export default router;
