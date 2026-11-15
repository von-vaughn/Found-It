/**
 * Extracts the ID number from a school email address.
 *
 * Example:
 *   "ty202500492@wmsu.edu.ph" -> "202500492"
 *   "ve202100318@wmsu.edu.ph" -> "202100318"
 *   "202500492@wmsu.edu.ph"   -> "202500492"
 *
 * Returns null if no digits are present in the local part of the email.
 */
export function extractIdNumberFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const localPart = email.trim().split("@")[0] || "";
  const digits = localPart.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

/** Prefers an explicitly stored school ID and falls back to email-derived digits. */
export function resolveIdNumber(
  schoolId?: string | null,
  email?: string | null,
): string | null {
  const trimmed = schoolId?.trim();
  if (trimmed) return trimmed;
  return extractIdNumberFromEmail(email);
}
