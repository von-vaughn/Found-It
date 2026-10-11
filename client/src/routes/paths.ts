export const paths = {
  home: "/",
  dashboard: "/dashboard",
  dashboardCreate: "/dashboard/create",
  dashboardNotifications: "/dashboard/notifications",
  dashboardFilters: "/dashboard/filters",
  dashboardItem: "/dashboard/items/:id",
  dashboardProfile: "/dashboard/profile",
  admin: "/admin",
  adminItems: "/admin/items",
  adminLost: "/admin/lost",
  adminFound: "/admin/found",
  adminClaims: "/admin/claims",
  adminReturns: "/admin/returns",
  adminUsers: "/admin/users",
  lostItems: "/lost-items",
  foundItems: "/found-items",
  browse: "/browse",
  fallback: "*",
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];
