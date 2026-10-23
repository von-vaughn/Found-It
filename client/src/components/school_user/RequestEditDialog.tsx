import { useState } from "react";
import { X } from "lucide-react";
import type { ClaimRequest } from "@/types/claim";

export interface EditableRequestPayload {
  claimantTitle: string;
  color?: string;
  building?: string;
  dateLost: string;
  timeLost: string;
  location: string;
  details: string;
  importantDetails: string;
  evidence?: string[];
}

interface RequestEditDialogProps {
  request: ClaimRequest | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: EditableRequestPayload) => Promise<void>;
}

interface RequestEditFormProps
  extends Omit<RequestEditDialogProps, "request"> {
  request: ClaimRequest;
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm text-neutral-900 transition-colors focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

const labelClass =
  "block text-xs font-bold text-neutral-700 dark:text-neutral-300";

function dateInputValue(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function RequestEditDialog({
  request,
  isSaving,
  onClose,
  onSave,
}: RequestEditDialogProps) {
  if (!request || request.status !== "Pending") return null;

  return (
    <RequestEditForm
      key={request.id}
      request={request}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function RequestEditForm({
  request,
  isSaving,
  onClose,
  onSave,
}: RequestEditFormProps) {
  const [claimantTitle, setClaimantTitle] = useState(
    () => request.claimantTitle ?? request.item,
  );
  const [color, setColor] = useState(() => request.color ?? "");
  const [building, setBuilding] = useState(() => request.building ?? "");
  const [dateLost, setDateLost] = useState(() => dateInputValue(request.dateLost));
  const [timeLost, setTimeLost] = useState(() => request.timeLost);
  const [location, setLocation] = useState(() => request.location);
  const [details, setDetails] = useState(() => request.details);
  const [importantDetails, setImportantDetails] = useState(
    () => request.importantDetails ?? "",
  );
  const [error, setError] = useState("");

  const isFoundReport = request.kind === "return";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !claimantTitle.trim() ||
      !dateLost ||
      !timeLost ||
      !location.trim() ||
      !details.trim() ||
      !importantDetails.trim()
    ) {
      setError("Complete each required field before saving.");
      return;
    }

    try {
      setError("");
      await onSave({
        claimantTitle: claimantTitle.trim(),
        color: color.trim() || undefined,
        building: building.trim() || undefined,
        dateLost,
        timeLost,
        location: location.trim(),
        details: details.trim(),
        importantDetails: importantDetails.trim(),
        evidence: request.evidence,
      });
    } catch (saveError) {
      const message = (
        saveError as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setError(message ?? "We couldn't save your changes. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <form
        aria-labelledby="edit-request-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 sm:p-6"
        role="dialog"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="edit-request-title"
              className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Edit {isFoundReport ? "found report" : "claim"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              You can edit this submission while it is pending review.
            </p>
          </div>
          <button
            aria-label="Close edit form"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            disabled={isSaving}
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            What is it?
            <input
              required
              className={inputClass}
              value={claimantTitle}
              onChange={(event) => setClaimantTitle(event.target.value)}
            />
          </label>
          <label className={labelClass}>
            Primary color
            <input
              className={inputClass}
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <label className={labelClass}>
            Date {isFoundReport ? "found" : "lost"}
            <input
              required
              type="date"
              className={`${inputClass} cursor-pointer`}
              value={dateLost}
              onChange={(event) => setDateLost(event.target.value)}
            />
          </label>
          <label className={labelClass}>
            Approximate time {isFoundReport ? "found" : "lost"}
            <input
              required
              type="time"
              className={`${inputClass} cursor-pointer`}
              value={timeLost}
              onChange={(event) => setTimeLost(event.target.value)}
            />
          </label>
          <label className={labelClass}>
            Location {isFoundReport ? "found" : "lost"}
            <input
              required
              className={inputClass}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>
          <label className={labelClass}>
            Building
            <input
              className={inputClass}
              value={building}
              onChange={(event) => setBuilding(event.target.value)}
            />
          </label>
        </div>

        <label className={`mt-4 ${labelClass}`}>
          Description
          <textarea
            required
            rows={4}
            className={`${inputClass} h-auto py-3`}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />
        </label>
        <label className={`mt-4 ${labelClass}`}>
          Important details
          <textarea
            required
            rows={3}
            className={`${inputClass} h-auto py-3`}
            value={importantDetails}
            onChange={(event) => setImportantDetails(event.target.value)}
          />
        </label>

        {error && (
          <p className="mt-4 text-sm font-medium text-red-700 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="h-11 rounded-xl px-4 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            disabled={isSaving}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="h-11 rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
