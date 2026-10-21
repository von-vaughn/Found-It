import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { uploadImages } from "@/services/itemService";
import type { NewClaimRequest } from "@/types/claim";

interface OwnershipClaimFormProps {
  itemId: string;
  itemTitle: string;
  claimant: string;
  onSubmitClaim: (claim: NewClaimRequest) => Promise<void> | void;
  onSubmitted: () => void;
  onCancel: () => void;
}

const localDate = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400";

const inputClass =
  "h-11 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 px-3.5 text-sm transition-colors focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200";

const MAX_EVIDENCE_IMAGES = 4;

export const OwnershipClaimForm: React.FC<OwnershipClaimFormProps> = ({
  itemId,
  itemTitle,
  claimant,
  onSubmitClaim,
  onSubmitted,
  onCancel,
}) => {
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [importantDetails, setImportantDetails] = useState("");
  const [claimTitle, setClaimTitle] = useState("");
  const [color, setColor] = useState("");
  const [building, setBuilding] = useState("");
  const [dateLost, setDateLost] = useState("");
  const [timeLost, setTimeLost] = useState("");
  const [locationLost, setLocationLost] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<
    { file: File; preview: string }[]
  >([]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceUrlsRef = useRef<string[]>([]);

  useEffect(
    () => () => {
      evidenceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const remainingSlots = MAX_EVIDENCE_IMAGES - evidenceFiles.length;
    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/"),
    );
    const filesToAdd = imageFiles.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      const newPreviews = filesToAdd.map((file) =>
        URL.createObjectURL(file),
      );
      evidenceUrlsRef.current.push(...newPreviews);
      setEvidenceFiles((current) => [
        ...current,
        ...filesToAdd.map((file, index) => ({
          file,
          preview: newPreviews[index],
        })),
      ]);
    }

    if (imageFiles.length !== selectedFiles.length) {
      setFormError("Only image files can be used as picture evidence.");
    } else if (filesToAdd.length < imageFiles.length) {
      setFormError(`You can upload up to ${MAX_EVIDENCE_IMAGES} pictures.`);
    } else {
      setFormError("");
    }
    event.target.value = "";
  };

  const handleRemoveEvidence = (previewToRemove: string) => {
    URL.revokeObjectURL(previewToRemove);
    evidenceUrlsRef.current = evidenceUrlsRef.current.filter(
      (url) => url !== previewToRemove,
    );
    setEvidenceFiles((current) =>
      current.filter(({ preview }) => preview !== previewToRemove),
    );
    setFormError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !claimTitle.trim() ||
      !additionalInfo.trim() ||
      !importantDetails.trim() ||
      !dateLost ||
      !timeLost ||
      !locationLost.trim()
    ) {
      setFormError("Complete each required field before submitting.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);
    try {
      const evidence =
        evidenceFiles.length > 0
          ? await uploadImages(evidenceFiles.map(({ file }) => file))
          : [];
      await onSubmitClaim({
        item: itemTitle,
        itemId,
        claimant,
        dateLost,
        timeLost,
        location: locationLost.trim(),
        details: additionalInfo.trim(),
        importantDetails: importantDetails.trim(),
        evidence,
        claimantTitle: claimTitle.trim(),
        color: color.trim() || undefined,
        building: building.trim() || undefined,
      });
      toast.success("Claim request submitted for admin review.");
      onSubmitted();
    } catch (error) {
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      console.error("Failed to submit claim request.", error);
      setFormError(
        message ?? "We couldn't submit your claim. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <p
        id="ownership-claim-description"
        className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
      >
        Share details that can help verify this item belongs to you. Your
        additional information, important details, lost date, time, and
        location are required. You may also attach picture evidence.
      </p>

      <form onSubmit={handleSubmit} className="mt-5">
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6">
        {/* Left: photo */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="claim-evidence" className={labelClass}>
              Picture evidence
            </label>
          </div>
          <input
            ref={fileInputRef}
            id="claim-evidence"
            name="evidence"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
          />
          <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3">
            <div className="grid grid-cols-2 gap-2">
              {evidenceFiles.map(({ preview }, index) => (
                <div
                  key={preview}
                  className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-neutral-900"
                >
                  <img
                    src={preview}
                    alt={`Picture evidence ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEvidence(preview)}
                    aria-label={`Remove picture ${index + 1}`}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 text-neutral-600 dark:text-neutral-400 shadow-sm transition-colors hover:bg-white hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {evidenceFiles.length < MAX_EVIDENCE_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-2 text-center transition-colors hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-white dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400"
                >
                  <ImagePlus
                    className="h-5 w-5 text-neutral-400 dark:text-neutral-500"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Add photo
                  </span>
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
              {evidenceFiles.length} of {MAX_EVIDENCE_IMAGES} pictures
              selected. You can add up to 4.
            </p>
          </div>
        </div>

        {/* Right: details */}
        <div className="min-w-0 space-y-4">
        <div>
          <label htmlFor="claim-title" className={labelClass}>
            What is it? <span aria-hidden="true">*</span>
          </label>
          <input
            id="claim-title"
            name="claimTitle"
            type="text"
            required
            value={claimTitle}
            onChange={(event) => setClaimTitle(event.target.value)}
            placeholder="Black backpack, iPhone 13…"
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="claim-color" className={labelClass}>
              Primary color
            </label>
            <div className="relative">
              <input
                id="claim-color"
                name="color"
                type="text"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="Black…"
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} pr-9`}
              />
              <span
                aria-hidden="true"
                style={{
                  backgroundColor: color.trim() || "transparent",
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-neutral-200 dark:border-neutral-800"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label htmlFor="claim-date-lost" className={labelClass}>
              Date lost <span aria-hidden="true">*</span>
            </label>
            <input
              id="claim-date-lost"
              name="dateLost"
              type="date"
              required
              max={localDate()}
              value={dateLost}
              onChange={(event) => setDateLost(event.target.value)}
              className={`${inputClass} cursor-pointer`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="claim-time-lost" className={labelClass}>
              Approximate time lost <span aria-hidden="true">*</span>
            </label>
            <input
              id="claim-time-lost"
              name="timeLost"
              type="time"
              required
              value={timeLost}
              onChange={(event) => setTimeLost(event.target.value)}
              className={`${inputClass} cursor-pointer`}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="claim-location-lost" className={labelClass}>
              Location lost <span aria-hidden="true">*</span>
            </label>
            <input
              id="claim-location-lost"
              name="locationLost"
              type="text"
              required
              value={locationLost}
              onChange={(event) => setLocationLost(event.target.value)}
              placeholder="Where do you think you lost it?"
              autoComplete="off"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="claim-building" className={labelClass}>
            Building
          </label>
          <select
            id="claim-building"
            name="building"
            value={building}
            onChange={(event) => setBuilding(event.target.value)}
            className={`${inputClass} appearance-none pr-9 cursor-pointer`}
          >
            <option value="">Select a building</option>
            {ITEM_BUILDINGS.map((buildingOption) => (
              <option key={buildingOption} value={buildingOption}>
                {buildingOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="claim-additional-info" className={labelClass}>
            Description <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="claim-additional-info"
            name="additionalInfo"
            required
            rows={3}
            value={additionalInfo}
            onChange={(event) => setAdditionalInfo(event.target.value)}
            placeholder="Describe marks, contents, or other details not shown in the post."
            className="w-full resize-y rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 p-3.5 text-sm transition-colors focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
          />
        </div>

        <div>
          <label htmlFor="claim-important-details" className={labelClass}>
            Important details <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="claim-important-details"
            name="importantDetails"
            required
            rows={3}
            value={importantDetails}
            onChange={(event) => setImportantDetails(event.target.value)}
            placeholder="Enter the unique mark only the owner would know…"
            className="w-full resize-y rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 p-3.5 text-sm transition-colors focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Used to verify ownership against the poster&apos;s private details.
          </p>
        </div>
        </div>
        </div>

        {formError && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {formError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 rounded-xl border border-neutral-200 dark:border-neutral-800 px-5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c91424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Claim"}
          </button>
        </div>
      </form>
    </>
  );
};
