export const paths = {
  home: "/",
  dashboard: "/dashboard",
  dashboardItem: "/dashboard/items/:id",
  dashboardProfile: "/dashboard/profile",
  admin: "/admin",
  adminLost: "/admin/lost",
  adminFound: "/admin/found",
  adminClaims: "/admin/claims",
  lostItems: "/lost-items",
  foundItems: "/found-items",
  login: "/login",
  signin: "/signin",
  signup: "/signup",
  verifyOtp: "/verify-otp",
  verify: "/verify",
  fallback: "*",
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];
