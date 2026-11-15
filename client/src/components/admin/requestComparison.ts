import type { AdminReport } from "./types";
import type { ClaimRequest } from "@/types/claim";

export type MatchTone = "ok" | "warn" | "bad" | "na";

export interface FieldComparison {
  status: MatchTone;
  note?: string;
}

export interface RequestComparisonSummary {
  score: number;
  totalComparable: number;
  color: FieldComparison;
  date: FieldComparison;
  time: FieldComparison;
  location: FieldComparison;
  building: FieldComparison;
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function toIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatAdminEventDate(value: string | undefined): string {
  if (!value) return "None";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.trim() || "None";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

export function formatAdminEventTime(value: string | undefined): string {
  if (!value) return "None";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "None";
  return new Intl.DateTimeFormat("en-PH", { timeStyle: "short" }).format(date);
}

function compareTextAttribute(
  requestValue: string | undefined,
  postValue: string | undefined,
  label: string,
): FieldComparison {
  const reqNorm = normalize(requestValue);
  const postNorm = normalize(postValue);
  if (!reqNorm || reqNorm === "none" || !postNorm || postNorm === "none") {
    return { status: "na" };
  }
  if (reqNorm === postNorm) {
    return { status: "ok", note: `Matches post (${postValue!.trim()})` };
  }
  return { status: "bad", note: `Different ${label} (post: ${postValue!.trim()})` };
}

function compareLocation(
  requestLoc: string | undefined,
  postLoc: string | undefined,
): FieldComparison {
  const reqNorm = normalize(requestLoc);
  const postNorm = normalize(postLoc);
  if (!reqNorm || reqNorm === "none" || !postNorm || postNorm === "none") {
    return { status: "na" };
  }
  if (reqNorm === postNorm) {
    return { status: "ok", note: "Matches post location" };
  }
  const postTokens = postNorm.split(" ").filter((word) => word.length > 3);
  const hasSharedKeyword =
    postTokens.some((word) => reqNorm.includes(word)) ||
    reqNorm.includes(postNorm) ||
    postNorm.includes(reqNorm);
  if (hasSharedKeyword) {
    return { status: "warn", note: `Post listed "${postLoc!.trim()}"` };
  }
  return { status: "bad", note: `Different location (post: ${postLoc!.trim()})` };
}

function compareDate(
  requestDate: string | undefined,
  postEventDateTime: string | undefined,
): FieldComparison {
  const reqIso = toIsoDate(requestDate);
  const postIso = toIsoDate(postEventDateTime);
  if (!reqIso || !postIso) {
    return { status: "na" };
  }
  if (reqIso === postIso) {
    return { status: "ok", note: "Same day as post" };
  }
  return {
    status: "bad",
    note: `Different date (post: ${formatAdminEventDate(postEventDateTime)})`,
  };
}

function compareTime(
  requestTime: string | undefined,
  postEventDateTime: string | undefined,
): FieldComparison {
  const reqNorm = normalize(requestTime);
  const postTimeFormatted = formatAdminEventTime(postEventDateTime);
  if (!reqNorm || reqNorm === "none" || postTimeFormatted === "None") {
    return { status: "na" };
  }
  if (reqNorm === normalize(postTimeFormatted)) {
    return { status: "ok", note: "Matches post time" };
  }
  return { status: "warn", note: `Post time: ${postTimeFormatted}` };
}

export function compareRequestWithPost(
  request: ClaimRequest,
  post: AdminReport | undefined,
): RequestComparisonSummary {
  if (!post) {
    return {
      score: 0,
      totalComparable: 0,
      color: { status: "na" },
      date: { status: "na" },
      time: { status: "na" },
      location: { status: "na" },
      building: { status: "na" },
    };
  }

  const color = compareTextAttribute(request.color, post.color, "color");
  const date = compareDate(request.dateLost, post.eventDateTime);
  const time = compareTime(request.timeLost, post.eventDateTime);
  const location = compareLocation(request.location, post.specificLocation);
  const building = compareTextAttribute(
    request.building,
    post.buildingName || post.building,
    "building",
  );

  const checks = [color, date, location, building].filter(
    (entry) => entry.status !== "na",
  );
  const score = checks.filter((entry) => entry.status === "ok").length;

  return {
    score,
    totalComparable: checks.length,
    color,
    date,
    time,
    location,
    building,
  };
}

export function sortRequestsByPostMatch(
  requests: ClaimRequest[],
  post: AdminReport | undefined,
): ClaimRequest[] {
  return [...requests].sort((a, b) => {
    const scoreDiff =
      compareRequestWithPost(b, post).score -
      compareRequestWithPost(a, post).score;
    if (scoreDiff !== 0) return scoreDiff;
    if (a.status === "Pending" && b.status !== "Pending") return -1;
    if (a.status !== "Pending" && b.status === "Pending") return 1;
    return 0;
  });
}
