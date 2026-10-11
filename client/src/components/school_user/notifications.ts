import { initialItems, type Item } from "@/data/mockItems";
import { claims as demoClaims } from "@/components/admin/adminData";
import type { ClaimRequest } from "@/types/claim";

export const FALLBACK_PROFILE_NAME = "Vaughn Evangelista";

export interface SchoolUserNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  itemId?: string;
}

const STATIC_NOTIFICATIONS: SchoolUserNotification[] = [
  {
    id: "demo-1",
    title: "New match found!",
    desc: "Someone reported finding keys near the Parking Lot.",
    time: "10m ago",
  },
  {
    id: "demo-2",
    title: "Item claimed",
    desc: "Black Herschel backpack inquiry was answered.",
    time: "1h ago",
  },
  {
    id: "demo-3",
    title: "Community update",
    desc: "WMSU Student Affairs posted campus verification guidelines.",
    time: "2h ago",
  },
];

export function buildNotifications(
  propItems: Item[] | undefined,
  submittedClaims: ClaimRequest[],
  profileName: string,
): SchoolUserNotification[] {
  const items = propItems ?? initialItems;
  const profileUsername = profileName.toLowerCase().replace(/\s+/g, "_");

  const myLostItemIds = new Set(
    items
      .filter(
        (item) =>
          item.type === "lost" &&
          (item.username?.toLowerCase() === profileUsername ||
            item.contactName.trim().toLowerCase() ===
              profileName.trim().toLowerCase()),
      )
      .map((item) => item.id),
  );

  const responseNotifications: SchoolUserNotification[] = [
    ...submittedClaims,
    ...demoClaims,
  ]
    .filter((claim) => myLostItemIds.has(claim.itemId))
    .map((claim) => ({
      id: `response-${claim.id}`,
      title: "Someone responded to your lost item",
      desc: `${claim.claimant} submitted a found report for your ${claim.item}.`,
      time: claim.submitted,
      itemId: claim.itemId,
    }));

  return [...responseNotifications, ...STATIC_NOTIFICATIONS];
}
