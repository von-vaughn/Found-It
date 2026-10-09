import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock3, ImagePlus, MapPin, X } from "lucide-react";
import toast from "react-hot-toast";
import type { NewClaimRequest } from "@/types/claim";

interface OwnershipClaimModalProps {
  itemId: string;
  itemTitle: string;
  claimant: string;
  onClose: () => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
}

const localDate = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500";

const inputClass =
  "h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm transition-colors focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200";

const MAX_EVIDENCE_IMAGES = 4;

export const OwnershipClaimModal: React.FC<OwnershipClaimModalProps> = ({
  itemId,
  itemTitle,
  claimant,
  onClose,
  onSubmitClaim,
}) => {
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [dateLost, setDateLost] = useState("");
  const [timeLost, setTimeLost] = useState("");
  const [locationLost, setLocationLost] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<
    { file: File; preview: string }[]
  >([]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const evidenceUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

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

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("The selected evidence image could not be read."));
      };
      reader.onerror = () =>
        reject(reader.error ?? new Error("The selected evidence image could not be read."));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !additionalInfo.trim() ||
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
      const evidence = await Promise.all(
        evidenceFiles.map(({ file }) => readFileAsDataUrl(file)),
      );
      onSubmitClaim({
        item: itemTitle,
        itemId,
        claimant,
        dateLost,
        timeLost,
        location: locationLost.trim(),
        details: additionalInfo.trim(),
        evidence,
      });
      toast.success("Claim request submitted for admin review.");
      onClose();
    } catch (error) {
      console.error("Failed to read claim evidence images.", error);
      setFormError("We couldn't read the selected pictures. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ownership-claim-title"
        aria-describedby="ownership-claim-description"
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-100 bg-white p-5 shadow-xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="ownership-claim-title"
              className="text-lg font-extrabold tracking-tight text-neutral-900"
            >
              Claim this item
            </h2>
            <p className="mt-1 truncate text-sm text-neutral-500">
              {itemTitle}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close ownership claim form"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p
          id="ownership-claim-description"
          className="mt-4 text-sm leading-relaxed text-neutral-600"
        >
          Share details that can help verify this item belongs to you. Your
          additional information, lost date, time, and location are required;
          picture evidence is optional.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="claim-evidence" className={labelClass}>
                Picture evidence
              </label>
              <span className="text-[11px] font-medium text-neutral-400">
                Optional
              </span>
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
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {evidenceFiles.map(({ preview }, index) => (
                  <div
                    key={preview}
                    className="relative aspect-square overflow-hidden rounded-lg bg-white"
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
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-neutral-600 shadow-sm transition-colors hover:bg-white hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {evidenceFiles.length < MAX_EVIDENCE_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-2 text-center transition-colors hover:border-neutral-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400"
                  >
                    <ImagePlus
                      className="h-5 w-5 text-neutral-400"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-neutral-700">
                      Add photo
                    </span>
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-neutral-500">
                {evidenceFiles.length} of {MAX_EVIDENCE_IMAGES} pictures
                selected. You can add up to 4.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="claim-additional-info" className={labelClass}>
              Additional item information <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="claim-additional-info"
              name="additionalInfo"
              required
              rows={3}
              value={additionalInfo}
              onChange={(event) => setAdditionalInfo(event.target.value)}
              placeholder="Describe marks, contents, or other details not shown in the post."
              className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-sm transition-colors focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="claim-date-lost" className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Date lost <span aria-hidden="true">*</span>
                </span>
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
            <div className="min-w-0">
              <label htmlFor="claim-time-lost" className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Time lost <span aria-hidden="true">*</span>
                </span>
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
          </div>

          <div>
            <label htmlFor="claim-location-lost" className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Location lost <span aria-hidden="true">*</span>
              </span>
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

          {formError && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-neutral-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
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
      </section>
    </div>
  );
};
