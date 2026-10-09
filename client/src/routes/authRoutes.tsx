import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { LoginPage } from "@/pages/auth/LoginPage";
import { VerificationPage } from "@/pages/auth/VerificationPage";
import { paths } from "./paths";

export function getAuthRoutes(): RouteObject[] {
  return [
    { path: paths.login, element: <LoginPage defaultMode="signin" /> },
    {
      path: paths.signin,
      element: <Navigate to={paths.login} replace />,
    },
    { path: paths.signup, element: <LoginPage defaultMode="signup" /> },
    { path: paths.verifyOtp, element: <VerificationPage /> },
    {
      path: paths.verify,
      element: <Navigate to={paths.verifyOtp} replace />,
    },
  ];
}
