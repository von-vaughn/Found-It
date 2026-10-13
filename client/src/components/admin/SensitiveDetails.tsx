import React, { useState } from "react";
import { Lock, X } from "lucide-react";

export function AdminPasswordModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (onSubmit(password)) {
      setPassword("");
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        aria-hidden="true"
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close password prompt"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2
          id="admin-password-title"
          className="mt-4 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          Enter admin password
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          These details are restricted. Enter your admin password to view
          them.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="Admin password"
            aria-label="Admin password"
            className="h-11 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
          />
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-neutral-900 dark:bg-neutral-100 px-5 text-sm font-bold text-white dark:text-neutral-900 transition-colors hover:bg-neutral-700 dark:hover:bg-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            View details
          </button>
        </form>
      </div>
    </div>
  );
}

export function LockedValue({
  value,
  fallback = "None",
  unlocked,
  onUnlock,
}: {
  value?: string | null;
  fallback?: string;
  unlocked: boolean;
  onUnlock: () => void;
}) {
  if (unlocked) {
    return <>{value?.trim() || fallback}</>;
  }
  return (
    <button
      type="button"
      onClick={onUnlock}
      title="Enter admin password to view"
      className="inline-flex cursor-pointer items-center gap-1.5 text-neutral-400 dark:text-neutral-500 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] rounded"
    >
      <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span aria-hidden="true" className="tracking-widest">
        ••••••
      </span>
      <span className="sr-only">Hidden — enter admin password to view</span>
    </button>
  );
}
