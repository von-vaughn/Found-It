import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { useBuildings } from "@/hooks/useBuildings";
import { useCreateWalkInReturn } from "@/hooks/useReturns";
import { checkSchoolUserBySchoolId } from "@/services/claimService";

interface WalkInReturnModalProps {
  open: boolean;
  itemId: string;
  itemTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

type WalkInMode = "account" | "guest";
type LookupState = "idle" | "checking" | "found" | "not_found";

const inputClass =
  "mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800";

const labelClass =
  "block text-xs font-semibold text-neutral-700 dark:text-neutral-300";

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function WalkInReturnModal({
  open,
  itemId,
  itemTitle,
  onClose,
  onSuccess,
}: WalkInReturnModalProps) {
  const [mode, setMode] = useState<WalkInMode>("account");
  const [accountSchoolId, setAccountSchoolId] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [contact, setContact] = useState("");

  // Online Return Request matching fields (without photo)
  const [claimantTitle, setClaimantTitle] = useState("");
  const [color, setColor] = useState("");
  const [building, setBuilding] = useState("");
  const [dateFound, setDateFound] = useState(getTodayDateString);
  const [timeFound, setTimeFound] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [importantDetails, setImportantDetails] = useState("");
  const [approvalInstructions, setApprovalInstructions] = useState("");
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const createWalkInReturn = useCreateWalkInReturn();
  const { data: buildings } = useBuildings();
  const buildingOptions =
    buildings?.map((entry) => entry.name) ?? ITEM_BUILDINGS;
  const todayStr = getTodayDateString();

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
        setError("Enter the School ID.");
        return;
      }
      if (lookupState !== "found" || !matchedUserId) {
        setError(
          'No registered account found for this School ID. Use "No Account" instead.',
        );
        return;
      }
    } else if (fullName.trim().length < 2) {
      setError("Enter the finder's full name.");
      return;
    }

    if (
      !claimantTitle.trim() ||
      !importantDetails.trim() ||
      !location.trim() ||
      !dateFound ||
      !timeFound
    ) {
      setError(
        "Enter what the item is, important details, location found, date found, and approximate time found.",
      );
      return;
    }

    const trimmedInstructions = approvalInstructions.trim();
    if (!trimmedInstructions) {
      setError("Enter pickup instructions for the owner.");
      return;
    }

    const commonPayload = {
      itemId,
      claimantTitle: claimantTitle.trim(),
      color: color.trim() || undefined,
      building: building.trim() || undefined,
      dateLost: dateFound,
      timeLost: timeFound,
      location: location.trim(),
      details: details.trim(),
      importantDetails: importantDetails.trim(),
      approvalInstructions: trimmedInstructions,
    };

    try {
      if (mode === "account") {
        await createWalkInReturn.mutateAsync({
          ...commonPayload,
          mode: "account",
          userId: matchedUserId!,
        });
        toast.success(
          "Walk-in return recorded. Owner notified with Pickup QR Pass.",
        );
      } else {
        await createWalkInReturn.mutateAsync({
          ...commonPayload,
          mode: "guest",
          fullName: fullName.trim(),
          schoolId: schoolId.trim() || undefined,
          contact: contact.trim() || undefined,
        });
        toast.success(
          `Walk-in return from ${fullName.trim()} recorded. Owner notified with Pickup QR Pass.`,
        );
      }
      onSuccess();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Could not record walk-in return. Please try again.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="walkin-return-title"
      onCancel={(event) => {
        if (createWalkInReturn.isPending) {
          event.preventDefault();
          return;
        }
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          !createWalkInReturn.isPending
        ) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 text-left text-neutral-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
        <div className="min-w-0">
          <h2
            id="walkin-return-title"
            className="text-base font-bold text-neutral-900 dark:text-neutral-100"
          >
            Record Walk-In Return
          </h2>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {itemTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={createWalkInReturn.isPending}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-h-[82vh] space-y-4 overflow-y-auto px-5 py-4"
      >
        <p className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-[11px] leading-relaxed text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          The item will be marked as <strong>Received by OSA</strong> and{" "}
          <strong>Approved</strong> immediately, sending the owner a Pickup QR
          Pass.
        </p>

        {/* Mode segmented control */}
        <div
          role="tablist"
          aria-label="Finder account type"
          className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "account"}
            onClick={() => {
              setMode("account");
              setError("");
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === "account"
                ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            Has Account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "guest"}
            onClick={() => {
              setMode("guest");
              setError("");
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === "guest"
                ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            No Account
          </button>
        </div>

        {/* Finder Identity */}
        {mode === "account" ? (
          <div className="space-y-2">
            <label htmlFor="walkin-return-school-id" className={labelClass}>
              School ID <span className="text-[#E5192D]">*</span>
            </label>
            <input
              id="walkin-return-school-id"
              type="text"
              value={accountSchoolId}
              onChange={(event) => {
                const value = event.target.value;
                setAccountSchoolId(value);
                setError("");
                if (!value.trim()) {
                  setLookupState("idle");
                  setMatchedUserId(null);
                } else {
                  setLookupState("checking");
                  setMatchedUserId(null);
                }
              }}
              placeholder="e.g. 2021-00318"
              autoComplete="off"
              className={inputClass}
            />
            {lookupState === "checking" && (
              <p className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
                Checking School ID…
              </p>
            )}
            {lookupState === "found" && (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Registered school user account found.
              </p>
            )}
            {lookupState === "not_found" && (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                No active account matches this School ID. Switch to &ldquo;No
                Account&rdquo; to continue.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="walkin-return-guest-name" className={labelClass}>
                Full Name <span className="text-[#E5192D]">*</span>
              </label>
              <input
                id="walkin-return-guest-name"
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setError("");
                }}
                placeholder="e.g. Juan Dela Cruz"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="walkin-return-guest-id" className={labelClass}>
                  School ID{" "}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <input
                  id="walkin-return-guest-id"
                  type="text"
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  placeholder="e.g. 2022-01420"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="walkin-return-guest-contact"
                  className={labelClass}
                >
                  Contact{" "}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <input
                  id="walkin-return-guest-contact"
                  type="text"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="Phone or email"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Found Item Details (same fields as online return request, without photo) */}
        <div className="space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <div>
            <label htmlFor="walkin-return-item-title" className={labelClass}>
              What is it? <span className="text-[#E5192D]">*</span>
            </label>
            <input
              id="walkin-return-item-title"
              type="text"
              required
              maxLength={100}
              value={claimantTitle}
              onChange={(event) => {
                setClaimantTitle(event.target.value);
                setError("");
              }}
              placeholder="e.g. Black Casio Scientific Calculator"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="walkin-return-color" className={labelClass}>
                Primary color{" "}
                <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <input
                id="walkin-return-color"
                type="text"
                maxLength={50}
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="e.g. Black, Navy Blue"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="walkin-return-building" className={labelClass}>
                Building{" "}
                <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <select
                id="walkin-return-building"
                value={building}
                onChange={(event) => setBuilding(event.target.value)}
                className={inputClass}
              >
                <option value="">Select a building</option>
                {buildingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="walkin-return-date" className={labelClass}>
                Date found <span className="text-[#E5192D]">*</span>
              </label>
              <input
                id="walkin-return-date"
                type="date"
                required
                max={todayStr}
                value={dateFound}
                onChange={(event) => {
                  setDateFound(event.target.value);
                  setError("");
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="walkin-return-time" className={labelClass}>
                Approximate time found <span className="text-[#E5192D]">*</span>
              </label>
              <input
                id="walkin-return-time"
                type="time"
                required
                value={timeFound}
                onChange={(event) => {
                  setTimeFound(event.target.value);
                  setError("");
                }}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="walkin-return-location" className={labelClass}>
              Location found <span className="text-[#E5192D]">*</span>
            </label>
            <input
              id="walkin-return-location"
              type="text"
              required
              maxLength={500}
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setError("");
              }}
              placeholder="e.g. Library 2nd floor study table"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="walkin-return-important" className={labelClass}>
              Important details <span className="text-[#E5192D]">*</span>
            </label>
            <textarea
              id="walkin-return-important"
              rows={2}
              required
              maxLength={2000}
              value={importantDetails}
              onChange={(event) => {
                setImportantDetails(event.target.value);
                setError("");
              }}
              placeholder="Distinguishing marks, serial number, stickers, or contents…"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label htmlFor="walkin-return-details" className={labelClass}>
              Description{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <textarea
              id="walkin-return-details"
              rows={2}
              maxLength={2000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Any extra context about the item or how it was found…"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label htmlFor="walkin-return-instructions" className={labelClass}>
              Pickup Instructions for Owner{" "}
              <span className="text-[#E5192D]">*</span>
            </label>
            <input
              id="walkin-return-instructions"
              type="text"
              required
              value={approvalInstructions}
              onChange={(event) => {
                setApprovalInstructions(event.target.value);
                setError("");
              }}
              placeholder="e.g. Bring valid School ID to OSA Window 2, 8 AM–5 PM"
              maxLength={500}
              className={inputClass}
            />
          </div>
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
            onClick={onClose}
            disabled={createWalkInReturn.isPending}
            className="h-9 rounded-lg border border-neutral-200 px-3.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              createWalkInReturn.isPending ||
              (mode === "account" && lookupState !== "found")
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createWalkInReturn.isPending ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
                Recording…
              </>
            ) : (
              "Record Walk-In Return"
            )}
          </button>
        </div>
      </form>
    </dialog>
  );
}
