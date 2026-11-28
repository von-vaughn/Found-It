import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert, X } from "lucide-react";
import type { AdminUser } from "./types";

interface SuspendUserModalProps {
  user: AdminUser | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (payload: {
    durationDays?: number;
    suspendedUntil?: string;
    reason: string;
  }) => Promise<void>;
}

const DURATION_PRESETS = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
] as const;

function getMinCustomDate(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SuspendUserModal({
  user,
  isSubmitting,
  onCancel,
  onConfirm,
}: SuspendUserModalProps) {
  const [durationMode, setDurationMode] = useState<"preset" | "custom">("preset");
  const [durationDays, setDurationDays] = useState<number>(7);
  const [customDate, setCustomDate] = useState<string>(getMinCustomDate);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = Boolean(user);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!user) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Enter a suspension reason (at least 3 characters).");
      return;
    }

    if (durationMode === "custom") {
      if (!customDate) {
        setError("Choose an expiry date for the suspension.");
        return;
      }
      // End of chosen local day
      const targetDate = new Date(`${customDate}T23:59:59`);
      if (Number.isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now()) {
        setError("Suspension expiry date must be in the future.");
        return;
      }
      await onConfirm({
        suspendedUntil: targetDate.toISOString(),
        reason: trimmedReason,
      });
      return;
    }

    await onConfirm({
      durationDays,
      reason: trimmedReason,
    });
  };

  const roleText = user.role === "staff" ? "Staff" : "School User";

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="suspend-user-title"
      onCancel={(event) => {
        if (isSubmitting) {
          event.preventDefault();
          return;
        }
        onCancel();
      }}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 text-left text-neutral-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
        <div className="min-w-0">
          <h2
            id="suspend-user-title"
            className="text-base font-bold text-neutral-900 dark:text-neutral-100"
          >
            Suspend Account
          </h2>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {user.name} · {roleText} ({user.email})
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          This account will be signed out immediately and blocked from signing in
          until the suspension expires or is lifted early.
        </p>

        {/* Duration selector */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Suspension duration <span className="text-[#E5192D]">*</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((preset) => {
              const active =
                durationMode === "preset" && durationDays === preset.days;
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => {
                    setDurationMode("preset");
                    setDurationDays(preset.days);
                    setError("");
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-[#E5192D] text-white"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setDurationMode("custom");
                setError("");
              }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                durationMode === "custom"
                  ? "bg-[#E5192D] text-white"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
            >
              Custom date
            </button>
          </div>

          {durationMode === "custom" && (
            <div className="pt-1">
              <label
                htmlFor="suspend-custom-date"
                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400"
              >
                Suspend until (end of day)
              </label>
              <input
                id="suspend-custom-date"
                type="date"
                min={getMinCustomDate()}
                value={customDate}
                onChange={(event) => {
                  setCustomDate(event.target.value);
                  setError("");
                }}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:[color-scheme:dark]"
              />
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label
            htmlFor="suspend-reason"
            className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
          >
            Reason <span className="text-[#E5192D]">*</span>
          </label>
          <textarea
            id="suspend-reason"
            rows={3}
            required
            maxLength={500}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
            placeholder="Explain why this account is being suspended…"
            className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 rounded-lg border border-neutral-200 px-3.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Suspending…
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Suspend account
              </>
            )}
          </button>
        </div>
      </form>
    </dialog>
  );
}
