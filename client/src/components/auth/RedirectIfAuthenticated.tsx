import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { paths } from "@/routes/paths";

// The landing page is for guests; signed-in users go straight to their dashboard.
export const RedirectIfAuthenticated: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Checking credentials…" />;
  }

  if (user) {
    const roleHome =
      user.role === "admin" || user.role === "super_admin"
        ? paths.admin
        : paths.dashboard;
    return <Navigate to={roleHome} replace />;
  }

  return <>{children}</>;
};

export default RedirectIfAuthenticated;
