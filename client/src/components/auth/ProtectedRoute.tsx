import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import type { Role } from "@/context/auth-context";
import { authService } from "@/services/authService";
import toast from "react-hot-toast";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changeError, setChangeError] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please sign in to access this page.", { id: "auth-required" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("foundit:open-auth", { detail: "signin" }),
        );
      }
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <img
          src="/logo.jpeg"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 animate-pulse rounded-xl object-contain"
        />
        <p className="text-xs font-semibold text-neutral-500">Checking credentials…</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Preserve attempted destination for safe redirect
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?redirect=${redirectParam}`} replace />;
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setChangeError("");
    if (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      setChangeError("Enter a new password between 8 and 72 characters.");
      return;
    }
    setIsChanging(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success("Password changed. Please sign in with your new password.");
      await logout();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not change password. Check your current password and try again.";
      setChangeError(message);
    } finally {
      setIsChanging(false);
    }
  };

  // Accounts seeded with a temporary password must rotate it before anything else
  if (user.mustChangePassword) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <form
          onSubmit={handleChangePassword}
          noValidate
          className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl sm:p-8"
        >
          <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">
            Password change required
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            This account was created with a temporary password. Choose a new one
            to continue.
          </p>
          <label
            className="mt-6 block text-sm font-semibold text-neutral-800"
            htmlFor="must-change-current"
          >
            Current password
          </label>
          <input
            id="must-change-current"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setChangeError("");
            }}
            className="mt-1.5 h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
          />
          <label
            className="mt-4 block text-sm font-semibold text-neutral-800"
            htmlFor="must-change-new"
          >
            New password
          </label>
          <input
            id="must-change-new"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setChangeError("");
            }}
            className="mt-1.5 h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
          />
          {changeError && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {changeError}
            </p>
          )}
          <button
            type="submit"
            disabled={isChanging}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isChanging ? "Updating…" : "Change password"}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 w-full rounded-sm text-center text-sm font-semibold text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
          >
            Sign out instead
          </button>
        </form>
      </div>
    );
  }

  // Enforce role authorization
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    toast.error("You are not authorized to view this section.");
    const roleFallback =
      user.role === "admin"
        ? "/admin"
        : user.role === "super_admin"
          ? "/superadmin"
          : "/dashboard";
    return <Navigate to={roleFallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
