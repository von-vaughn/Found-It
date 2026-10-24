import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { paths } from "@/routes/paths";
import { isSchoolUserRole } from "./schoolUserGuard";

/**
 * Users with the school_user role have their own authenticated dashboard (/dashboard)
 * to browse items, search, and file claims. They must not access the public/landing
 * Browse Items section.
 */
export const RedirectIfSchoolUser: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Checking credentials…" />;
  }

  if (isSchoolUserRole(user?.role)) {
    return <Navigate to={paths.dashboard} replace />;
  }

  return <>{children}</>;
};

export default RedirectIfSchoolUser;
