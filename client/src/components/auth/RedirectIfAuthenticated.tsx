import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { paths } from "@/routes/paths";

// The landing page is for guests; signed-in users go straight to their dashboard.
export const RedirectIfAuthenticated: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <img
          src="/logo.jpeg"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 animate-pulse rounded-xl object-contain"
        />
        <p className="text-xs font-semibold text-neutral-500">
          Checking credentials…
        </p>
      </div>
    );
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
