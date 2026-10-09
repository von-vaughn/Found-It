// One-shot flag that carries the sidebar's expanded state across the
// AdminLayout remount caused by section navigation.
//
// It is set from a nav-icon click (while the pointer location is known) and
// consumed once by the next AdminLayout mount. Anything that doesn't consume
// it (e.g. a fresh page load) simply starts collapsed.

let stickyExpanded = false;

export function rememberAdminSidebarExpanded(expanded: boolean): void {
  stickyExpanded = expanded;
}

export function takeAdminSidebarExpanded(): boolean {
  const value = stickyExpanded;
  stickyExpanded = false;
  return value;
}
