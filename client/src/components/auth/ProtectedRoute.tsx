import React, { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import type { Role } from "@/context/auth-context";
import { LoadingScreen } from "@/components/LoadingScreen";
import toast from "react-hot-toast";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const unauthorizedToastShownRef = useRef(false);

  const isUnauthorizedRole = Boolean(
    !isLoading &&
      isAuthenticated &&
      user &&
      allowedRoles &&
      !allowedRoles.includes(user.role),
  );

  useEffect(() => {
    if (isUnauthorizedRole && !unauthorizedToastShownRef.current) {
      unauthorizedToastShownRef.current = true;
      toast.error("You are not authorized to view this section.");
    } else if (!isUnauthorizedRole) {
      unauthorizedToastShownRef.current = false;
    }
  }, [isUnauthorizedRole]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // The auth modal itself explains why; a toast on top of it is noise.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("foundit:open-auth", { detail: "signin" }),
        );
      }
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen message="Checking credentials…" />;
  }

  if (!isAuthenticated || !user) {
    // Preserve attempted destination for safe redirect
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?redirect=${redirectParam}`} replace />;
  }

  // Enforce role authorization
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleFallback =
      user.role === "admin" || user.role === "super_admin"
        ? "/admin"
        : "/dashboard";
    return <Navigate to={roleFallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
