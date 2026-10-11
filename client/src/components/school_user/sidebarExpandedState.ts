// One-shot flag that carries the school_user sidebar's expanded state across
// the page remount caused by sidebar-icon navigation (e.g. Profile ->
// Dashboard via the home icon).
//
// It is set from the home-icon click (while the pointer location is known)
// and consumed once by the next school_user page mount. The flag expires
// quickly: the Dashboard home button doesn't navigate (no remount), so a flag
// set there must not leak into a much later unrelated navigation (e.g.
// Dashboard -> Profile via the header).
//
// Mirrors components/admin/sidebarStickyState.ts.

let stickyExpanded = false;
let stickyTimestamp = 0;

// Navigation remounts render synchronously after the click, so a short TTL
// easily covers the legitimate handoff while discarding stale flags.
const STICKY_TTL_MS = 800;

export function rememberSchoolSidebarExpanded(expanded: boolean): void {
  stickyExpanded = expanded;
  stickyTimestamp = Date.now();
}

export function takeSchoolSidebarExpanded(): boolean {
  const fresh = Date.now() - stickyTimestamp <= STICKY_TTL_MS;
  const value = fresh ? stickyExpanded : false;
  stickyExpanded = false;
  stickyTimestamp = 0;
  return value;
}

export function discardSchoolSidebarExpanded(): void {
  stickyExpanded = false;
  stickyTimestamp = 0;
}
