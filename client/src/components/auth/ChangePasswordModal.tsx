import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { authService } from "@/services/authService";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const resetAndClose = () => {
    if (isSubmitting) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (
      newPassword.length < 8 ||
      new TextEncoder().encode(newPassword).length > 72
    ) {
      setError("Enter a new password between 8 and 72 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      window.dispatchEvent(new Event("foundit:auth-unauthorized"));
      toast.success("Password changed. Please sign in with your new password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        "Could not change password. Check your current password and try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          resetAndClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center gap-2">
          <KeyRound
            className="h-4 w-4 text-[#E5192D]"
            aria-hidden="true"
          />
          <h2
            id="change-password-title"
            className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            Change password
          </h2>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          For your security, you will be signed out and asked to log in again
          with your new password.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3.5">
          <div>
            <label
              htmlFor="change-current-password"
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Current password
            </label>
            <input
              id="change-current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setError("");
              }}
              className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-[#E5192D]/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <div>
            <label
              htmlFor="change-new-password"
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              New password
            </label>
            <input
              id="change-new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError("");
              }}
              className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-[#E5192D]/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <div>
            <label
              htmlFor="change-confirm-password"
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Confirm new password
            </label>
            <input
              id="change-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
              }}
              className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-[#E5192D]/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={resetAndClose}
              className="h-10 rounded-xl border border-neutral-200 px-4 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-xl bg-[#E5192D] px-4 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
};
