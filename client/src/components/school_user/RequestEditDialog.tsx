import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
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
  "w-full h-11 px-3.5 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:text-neutral-100 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors";

const labelClass =
  "block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5";

const textareaClass =
  "w-full p-3.5 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:text-neutral-100 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors resize-none";

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
          <div>
            <label className={labelClass} htmlFor="edit-request-title-field">
              What is it?
            </label>
            <input
              id="edit-request-title-field"
              required
              className={inputClass}
              value={claimantTitle}
              onChange={(event) => setClaimantTitle(event.target.value)}
              placeholder="Black backpack, iPhone 13…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-request-color">
              Primary color
            </label>
            <div className="relative">
              <input
                id="edit-request-color"
                className={`${inputClass} pr-9`}
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="Black…"
                autoComplete="off"
                spellCheck={false}
              />
              <span
                aria-hidden="true"
                style={{ backgroundColor: color.trim() || "transparent" }}
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-neutral-200 dark:border-neutral-800"
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-request-date">
              Date {isFoundReport ? "found" : "lost"}
            </label>
            <input
              id="edit-request-date"
              required
              type="date"
              className={`${inputClass} cursor-pointer`}
              value={dateLost}
              onChange={(event) => setDateLost(event.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-request-time">
              Approximate time {isFoundReport ? "found" : "lost"}
            </label>
            <input
              id="edit-request-time"
              required
              type="time"
              className={`${inputClass} cursor-pointer`}
              value={timeLost}
              onChange={(event) => setTimeLost(event.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-request-location">
              Location {isFoundReport ? "found" : "lost"}
            </label>
            <input
              id="edit-request-location"
              required
              className={inputClass}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={
                isFoundReport
                  ? "Where did you find it?"
                  : "Where do you think you lost it?"
              }
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-request-building">
              Building
            </label>
            <div className="relative">
              <select
                id="edit-request-building"
                className={`${inputClass} appearance-none cursor-pointer pr-9`}
                value={building}
                onChange={(event) => setBuilding(event.target.value)}
              >
                <option value="">Select a building</option>
                {ITEM_BUILDINGS.map((buildingOption) => (
                  <option key={buildingOption} value={buildingOption}>
                    {buildingOption}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass} htmlFor="edit-request-description">
            Description
          </label>
          <textarea
            id="edit-request-description"
            required
            rows={4}
            className={textareaClass}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Describe the item's appearance"
          />
        </div>
        <div className="mt-4">
          <label className={labelClass} htmlFor="edit-request-important-details">
            Important details
          </label>
          <textarea
            id="edit-request-important-details"
            required
            rows={3}
            className={textareaClass}
            value={importantDetails}
            onChange={(event) => setImportantDetails(event.target.value)}
            placeholder="Unique mark only the owner would know…"
          />
        </div>

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
