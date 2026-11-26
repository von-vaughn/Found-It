const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PickupRequestKind = "claim" | "return";

export interface ParsedPickupQrPayload {
  kind: PickupRequestKind;
  requestId: string;
  targetPath: string;
}

/** Builds the direct admin detail URL encoded inside an approved pickup QR code. */
export function buildPickupQrUrl(
  origin: string,
  kind: PickupRequestKind,
  requestId: string,
): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  const segment = kind === "claim" ? "claims" : "returns";
  return `${cleanOrigin}/admin/${segment}/${encodeURIComponent(requestId.trim())}`;
}

/**
 * Formats the first 8 hex characters of a UUID as a human-readable desk fallback code.
 * Matches directly against `claim.id` / `request.id` in the admin search bar.
 */
export function formatPickupReferenceCode(requestId: string): string {
  return requestId.trim().slice(0, 8).toUpperCase();
}

/**
 * Validates a scanned QR string and extracts the admin route if it points to a
 * Found-It claim or return detail page on the expected origin.
 */
export function parsePickupQrPayload(
  rawValue: string,
  expectedOrigin?: string,
): ParsedPickupQrPayload | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  let pathname: string;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    pathname = trimmed.split(/[?#]/)[0] ?? "";
  } else {
    try {
      const parsedUrl = new URL(trimmed);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return null;
      }
      if (
        expectedOrigin &&
        parsedUrl.origin !== expectedOrigin.replace(/\/+$/, "")
      ) {
        return null;
      }
      pathname = parsedUrl.pathname;
    } catch {
      return null;
    }
  }

  const match = /^\/admin\/(claims|returns)\/([^/]+)\/?$/i.exec(pathname);
  if (!match) return null;

  let requestId: string;
  try {
    requestId = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  if (!UUID_RE.test(requestId)) return null;

  const kind: PickupRequestKind =
    match[1].toLowerCase() === "claims" ? "claim" : "return";
  const segment = kind === "claim" ? "claims" : "returns";
  return {
    kind,
    requestId,
    targetPath: `/admin/${segment}/${encodeURIComponent(requestId)}`,
  };
}
