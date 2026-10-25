import { Router } from "express";
import {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  deleteMyNotification,
  deleteMyReadNotifications,
} from "../controllers/notifications.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);
router.get("/", getMyNotifications);
router.patch("/read-all", markAllMyNotificationsRead);
router.patch("/:id/read", markMyNotificationRead);
router.delete("/read", deleteMyReadNotifications);
router.delete("/:id", deleteMyNotification);

export default router;
