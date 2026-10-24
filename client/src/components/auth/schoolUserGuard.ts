/**
 * Determines whether a given user role should be blocked from the public landing
 * browse section and redirected to their authenticated dashboard.
 */
export function isSchoolUserRole(role?: string | null): boolean {
  return role === "school_user";
}
