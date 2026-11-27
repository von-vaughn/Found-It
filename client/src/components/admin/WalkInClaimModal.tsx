import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { checkSchoolUserBySchoolId } from "@/services/claimService";
import { useCreateWalkInClaim } from "@/hooks/useClaims";

interface WalkInClaimModalProps {
  open: boolean;
  itemId: string;
  itemTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

type WalkInMode = "account" | "guest";
type LookupState = "idle" | "checking" | "found" | "not_found";

export function WalkInClaimModal({
  open,
  itemId,
  itemTitle,
  onClose,
  onSuccess,
}: WalkInClaimModalProps) {
  const [mode, setMode] = useState<WalkInMode>("account");
  const [accountSchoolId, setAccountSchoolId] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const createWalkInClaim = useCreateWalkInClaim();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "account") return;
    const trimmed = accountSchoolId.trim();
    if (!trimmed) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLookupState("checking");
      checkSchoolUserBySchoolId(trimmed)
        .then((res) => {
          if (cancelled) return;
          if (res.exists && res.userId) {
            setLookupState("found");
            setMatchedUserId(res.userId);
          } else {
            setLookupState("not_found");
            setMatchedUserId(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLookupState("not_found");
            setMatchedUserId(null);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, mode, accountSchoolId]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "account") {
      if (!accountSchoolId.trim()) {
        setError("Enter the claimant's School ID.");
        return;
      }
      if (lookupState !== "found" || !matchedUserId) {
        setError(
          'No registered account found for this School ID. Use "No account (Walk-in)" instead.',
        );
        return;
      }
      try {
        await createWalkInClaim.mutateAsync({
          itemId,
          mode: "account",
          userId: matchedUserId,
        });
        toast.success("Walk-in claim recorded and item marked as claimed.");
        onSuccess();
      } catch (err) {
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        setError(msg || "Could not record walk-in claim. Please try again.");
      }
      return;
    }

    if (fullName.trim().length < 2) {
      setError("Enter the claimant's full name.");
      return;
    }
    if (schoolId.trim().length < 2) {
      setError("Enter the claimant's school ID or ID number.");
      return;
    }

    try {
      await createWalkInClaim.mutateAsync({
        itemId,
        mode: "guest",
        fullName: fullName.trim(),
        schoolId: schoolId.trim(),
        contact: contact.trim() || undefined,
      });
      toast.success(`Item marked as claimed by ${fullName.trim()}.`);
      onSuccess();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Could not record walk-in claim. Please try again.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="walkin-claim-title"
      onCancel={(event) => {
        if (createWalkInClaim.isPending) {
          event.preventDefault();
          return;
        }
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          !createWalkInClaim.isPending
        ) {
          onClose();
        }
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="walkin-claim-title"
              className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Walk-in claim
            </h2>
            <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
              Release &ldquo;{itemTitle}&rdquo; directly at the OSA desk.
            </p>
          </div>
          <button
            type="button"
            disabled={createWalkInClaim.isPending}
            onClick={onClose}
            aria-label="Close walk-in claim modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Claimant account type"
          className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "account"}
            onClick={() => {
              setMode("account");
              setError("");
            }}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === "account"
                ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Registered user
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "guest"}
            onClick={() => {
              setMode("guest");
              setError("");
            }}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === "guest"
                ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            No account (Walk-in)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {mode === "account" ? (
            <div className="space-y-2.5">
              <label
                htmlFor="walkin-account-school-id"
                className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
              >
                School ID <span className="text-[#E5192D]">*</span>
              </label>
              <input
                id="walkin-account-school-id"
                type="text"
                autoComplete="off"
                maxLength={30}
                value={accountSchoolId}
                onChange={(event) => {
                  const next = event.target.value;
                  setAccountSchoolId(next);
                  setMatchedUserId(null);
                  setLookupState(next.trim() ? "checking" : "idle");
                  setError("");
                }}
                placeholder="Enter student School ID (e.g., 2022-00412)"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
              />

              {lookupState === "checking" && (
                <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  Checking School ID…
                </p>
              )}

              {lookupState === "found" && (
                <p
                  role="status"
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  School ID found. Ready to mark as claimed.
                </p>
              )}

              {lookupState === "not_found" && (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    No registered account found for this School ID. Double-check
                    the ID or switch to &ldquo;No account (Walk-in)&rdquo;.
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="walkin-fullname"
                  className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  Full name <span className="text-[#E5192D]">*</span>
                </label>
                <input
                  id="walkin-fullname"
                  type="text"
                  required
                  maxLength={120}
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setError("");
                  }}
                  placeholder="e.g., Juan Dela Cruz"
                  className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="walkin-school-id"
                    className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
                  >
                    School ID / ID number{" "}
                    <span className="text-[#E5192D]">*</span>
                  </label>
                  <input
                    id="walkin-school-id"
                    type="text"
                    required
                    maxLength={30}
                    value={schoolId}
                    onChange={(event) => {
                      setSchoolId(event.target.value);
                      setError("");
                    }}
                    placeholder="e.g., 2022-00412"
                    className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                  />
                </div>
                <div>
                  <label
                    htmlFor="walkin-contact"
                    className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
                  >
                    Email / Contact{" "}
                    <span className="font-normal text-neutral-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="walkin-contact"
                    type="text"
                    maxLength={120}
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    placeholder="Email or mobile number"
                    className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-[#E5192D] dark:text-red-400"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={createWalkInClaim.isPending}
              onClick={onClose}
              className="h-10 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                createWalkInClaim.isPending ||
                (mode === "account" && lookupState !== "found")
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createWalkInClaim.isPending
                ? "Recording…"
                : "Confirm & mark claimed"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
