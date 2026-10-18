import type { Item } from "@/data/mockItems";
import type { ServerItem } from "@/services/itemService";

/**
 * Formats a relative time-ago string from a date.
 * Returns e.g. "Just now", "5m ago", "2h ago", "3d ago".
 */
function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

/**
 * Converts a server-side Item into the client-side `Item` shape used by the
 * existing UI components (ItemCard, ItemDetailPage, etc.).
 */
export function toClientItem(server: ServerItem): Item {
  const dateTime = server.itemTime
    ? `${server.itemDate}T${server.itemTime}`
    : undefined;

  return {
    id: server.id,
    title: server.name,
    type: server.reportType,
    category: server.category as Item["category"],
    building: server.building ?? undefined,
    location: server.location ?? "",
    date: server.itemDate,
    dateTime,
    timeAgo: timeAgo(server.createdAt),
    image: server.image || (server.images?.[0] ?? ""),
    images: server.images ?? (server.image ? [server.image] : []),
    description: server.description,
    status: "active",
    color: server.color ?? undefined,
    confidentialInfo: server.importantDetails,
    contactName: server.user.name,
    username: server.user.name.toLowerCase().replace(/\s+/g, "_"),
    likes: 0,
    commentsCount: 0,
    saved: false,
  };
}

/**
 * Batch-convert an array of server items to client items.
 */
export function toClientItems(serverItems: ServerItem[]): Item[] {
  return serverItems.map(toClientItem);
}
