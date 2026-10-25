import api from "@/lib/api";

export type NotificationKind = "claim" | "return";
export type NotificationEvent =
  | "submitted"
  | "approved"
  | "rejected"
  | "returned";

export interface ServerNotification {
  id: string;
  itemId: string | null;
  requestId: string | null;
  kind: NotificationKind;
  event: NotificationEvent;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function formatNotificationTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Just now";
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  if (Math.abs(seconds) < 3600) {
    return formatter.format(Math.round(seconds / 60), "minute");
  }
  if (Math.abs(seconds) < 86400) {
    return formatter.format(Math.round(seconds / 3600), "hour");
  }
  return formatter.format(Math.round(seconds / 86400), "day");
}

export function notificationStatusLabel(
  event: NotificationEvent,
): string {
  return event === "submitted"
    ? "Pending"
    : event[0].toUpperCase() + event.slice(1);
}

interface ListNotificationsResponse {
  notifications: ServerNotification[];
  count: number;
  unreadCount: number;
}

/** GET /api/notifications — the signed-in user's notifications. */
export async function listNotifications(): Promise<ServerNotification[]> {
  const { data } =
    await api.get<ListNotificationsResponse>("/notifications");
  return data.notifications;
}

/** PATCH /api/notifications/:id/read — persist one notification's read state. */
export async function markNotificationRead(id: string): Promise<void> {
  await api.patch<{ message: string }>(`/notifications/${id}/read`);
}

/** PATCH /api/notifications/read-all — persist all read states for this user. */
export async function markAllNotificationsRead(): Promise<void> {
  await api.patch<{ message: string }>("/notifications/read-all");
}

/** DELETE /api/notifications/:id — clear one of the signed-in user's notifications. */
export async function deleteNotification(id: string): Promise<void> {
  await api.delete<{ message: string }>(`/notifications/${id}`);
}

/** DELETE /api/notifications/read — clear all notifications already read by this user. */
export async function deleteReadNotifications(): Promise<void> {
  await api.delete<{ message: string }>("/notifications/read");
}
