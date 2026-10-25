import type { Request, Response } from "express";
import { z } from "zod";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotificationForUser,
  deleteReadNotificationsForUser,
} from "../repositories/notification.repository";

const notificationIdSchema = z.string().uuid();

export async function getMyNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  const notifications = await listNotificationsForUser(req.user!.sub);
  res.json({
    notifications,
    count: notifications.length,
    unreadCount: notifications.filter((notification) => !notification.isRead)
      .length,
  });
}

export async function markMyNotificationRead(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = notificationIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid notification ID." });
    return;
  }
  const updated = await markNotificationRead(req.user!.sub, parsed.data);
  if (!updated) {
    res.status(404).json({ message: "Notification not found." });
    return;
  }
  res.json({ message: "Notification marked as read." });
}

export async function markAllMyNotificationsRead(
  req: Request,
  res: Response,
): Promise<void> {
  await markAllNotificationsRead(req.user!.sub);
  res.json({ message: "Notifications marked as read." });
}

export async function deleteMyNotification(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = notificationIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid notification ID." });
    return;
  }
  const deleted = await deleteNotificationForUser(req.user!.sub, parsed.data);
  if (!deleted) {
    res.status(404).json({ message: "Notification not found." });
    return;
  }
  res.json({ message: "Notification cleared." });
}

export async function deleteMyReadNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  await deleteReadNotificationsForUser(req.user!.sub);
  res.json({ message: "Read notifications cleared." });
}
