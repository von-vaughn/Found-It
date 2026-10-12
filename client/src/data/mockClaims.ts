import type { ClaimRequest } from "@/types/claim";

/**
 * Example claim requests shown on the school_user "My claim requests" page.
 *
 * `MyClaimsPage` filters `submittedClaims` by the signed-in profile name
 * (`user?.name`, falling back to "Vaughn Evangelista" when signed out), so
 * examples are seeded for both names: the fallback profile and the default
 * demo login (`student@wmsu.edu.ph` → "Alex Rivera").
 *
 * Statuses intentionally cover every filter tab:
 * Pending + Under review → "Pending", Approved/Claimed/Returned → "Approved",
 * Rejected → "Rejected" (see `simplifyClaimStatus`).
 */
export const initialSubmittedClaims: ClaimRequest[] = [
  {
    id: "CL-2411",
    status: "Pending",
    item: "iPhone 13",
    itemId: "item-2",
    claimant: "Vaughn Evangelista",
    email: "vaughn@wmsu.edu.ph",
    dateLost: "October 9, 2026",
    timeLost: "3:20 PM",
    location: "Library Building",
    details:
      "White iPhone 13 with a clear case and a small chip on the bottom-left corner. My lock screen is a photo of my dog wearing a red bandana.",
    submitted: "Today, 9:12 AM",
    evidence: [],
    claimantTitle: "iPhone 13",
    color: "White",
    building: "Library",
  },
  {
    id: "CL-2412",
    status: "Approved",
    item: "Wallet",
    itemId: "item-4",
    claimant: "Vaughn Evangelista",
    email: "vaughn@wmsu.edu.ph",
    dateLost: "October 5, 2026",
    timeLost: "11:00 AM",
    location: "Main Gate",
    details:
      "Dark brown bifold wallet with my initials embossed on the corner and a faded photo booth strip in the bill section.",
    submitted: "October 8, 2026, 2:05 PM",
    evidence: [],
    claimantTitle: "Wallet",
    color: "Brown",
    building: "WMSU Administration Building",
  },
  {
    id: "CL-2413",
    status: "Under review",
    item: "Water Bottle",
    itemId: "item-6",
    claimant: "Vaughn Evangelista",
    email: "vaughn@wmsu.edu.ph",
    dateLost: "October 7, 2026",
    timeLost: "After lunch",
    location: "Cafeteria B",
    details:
      "Blue bottle with two stickers near the base. My name is written in marker underneath the bottle.",
    submitted: "October 9, 2026, 4:48 PM",
    evidence: [],
    claimantTitle: "Water Bottle",
    color: "Blue",
    building: "Cafeteria B - Beside CCS",
  },
  {
    id: "CL-2414",
    status: "Rejected",
    item: "Notebook",
    itemId: "item-8",
    claimant: "Vaughn Evangelista",
    email: "vaughn@wmsu.edu.ph",
    dateLost: "October 2, 2026",
    timeLost: "1:00 PM",
    location: "Admin Building",
    details:
      "Blue spiral notebook. I thought it was mine, but the initials inside the front cover did not match.",
    submitted: "October 6, 2026, 10:26 AM",
    evidence: [],
    claimantTitle: "Notebook",
    color: "Blue",
    building: "WMSU Administration Building",
  },
  {
    id: "CL-2415",
    status: "Pending",
    item: "Jacket",
    itemId: "item-10",
    claimant: "Alex Rivera",
    email: "student@wmsu.edu.ph",
    dateLost: "October 8, 2026",
    timeLost: "5:30 PM",
    location: "Auditorium",
    details:
      "Gray jacket with a small department logo on the left sleeve. Left it on my seat after the afternoon program.",
    submitted: "Today, 8:02 AM",
    evidence: [],
    claimantTitle: "Jacket",
    color: "Gray",
    building: "Open Stage",
  },
  {
    id: "CL-2416",
    status: "Claimed",
    item: "Keys",
    itemId: "item-12",
    claimant: "Alex Rivera",
    email: "student@wmsu.edu.ph",
    dateLost: "October 6, 2026",
    timeLost: "4:30 PM",
    location: "Parking Lot",
    details:
      "Toyota car keys with a black fob and a small red tag on the key ring. Already verified at the OSA office.",
    submitted: "October 7, 2026, 1:15 PM",
    evidence: [],
    claimantTitle: "Keys",
    color: "Silver",
    building: "",
  },
];
