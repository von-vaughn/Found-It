import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Search, UserCheck, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  searchSchoolUsersForWalkIn,
  type WalkInSchoolUserOption,
} from "@/services/claimService";
import { useCreateWalkInClaim } from "@/hooks/useClaims";

interface WalkInClaimModalProps {
  open: boolean;
  itemId: string;
  itemTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

type WalkInMode = "account" | "guest";

export function WalkInClaimModal({
  open,
  itemId,
  itemTitle,
  onClose,
  onSuccess,
}: WalkInClaimModalProps) {
  const [mode, setMode] = useState<WalkInMode>("account");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<WalkInSchoolUserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] =
    useState<WalkInSchoolUserOption | null>(null);

  const [fullName, setFullName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
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
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchSchoolUsersForWalkIn(search)
        .then((users) => {
          if (!cancelled) setResults(users);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, mode, search]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "account") {
      if (!selectedUser) {
        setError("Select a registered school user first.");
        return;
      }
      try {
        await createWalkInClaim.mutateAsync({
          itemId,
          mode: "account",
          userId: selectedUser.id,
          notes: notes.trim() || undefined,
        });
        toast.success(`Item marked as claimed by ${selectedUser.name}.`);
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
        notes: notes.trim() || undefined,
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
        if (event.target === event.currentTarget && !createWalkInClaim.isPending) {
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
                htmlFor="walkin-user-search"
                className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
              >
                Find school user <span className="text-[#E5192D]">*</span>
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  id="walkin-user-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, or school ID…"
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                />
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-neutral-200 divide-y divide-neutral-100 dark:border-neutral-800 dark:divide-neutral-800">
                {searching ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-neutral-500 dark:text-neutral-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Searching…
                  </div>
                ) : results.length === 0 ? (
                  <p className="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    No matching school users found. Switch to &ldquo;No account (Walk-in)&rdquo; if they aren&apos;t registered.
                  </p>
                ) : (
                  results.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setError("");
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? "bg-red-50/70 dark:bg-red-500/15"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/70"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {u.name}
                          </p>
                          <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                            {u.schoolId ? `ID ${u.schoolId} · ` : ""}
                            {u.email}
                          </p>
                        </div>
                        {isSelected && (
                          <Check
                            className="h-4 w-4 shrink-0 text-[#E5192D]"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
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
                    School ID / ID number <span className="text-[#E5192D]">*</span>
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
                    <span className="font-normal text-neutral-400">(optional)</span>
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

          <div>
            <label
              htmlFor="walkin-notes"
              className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
            >
              Verification notes{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <textarea
              id="walkin-notes"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g., Presented school ID and described lockscreen / contents."
              className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
            />
          </div>

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
                (mode === "account" && !selectedUser)
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createWalkInClaim.isPending ? "Recording…" : "Confirm & mark claimed"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
