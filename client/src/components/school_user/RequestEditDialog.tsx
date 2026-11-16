import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ImagePlus, X } from "lucide-react";
import { SelectDropdown } from "@/components/SelectDropdown";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { useBuildings } from "@/hooks/useBuildings";
import { uploadImages } from "@/services/itemService";
import { localTodayDate } from "@/lib/date";
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
  "block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 capitalize mb-1.5";

const textareaClass =
  "w-full p-3.5 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:text-neutral-100 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors resize-none";

const MAX_EVIDENCE_IMAGES = 4;

interface EvidencePhoto {
  preview: string;
  url?: string;
  file?: File | Blob;
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera access was denied. Allow camera access in your browser settings, then try again.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "No camera was found on this device.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is already in use by another app. Close it and try again.";
    }
  }
  return "The camera could not be started. Check your camera connection and try again.";
}

function LiveFoundCameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    const videoEl = videoRef.current;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera access is unavailable. Use a secure connection and a browser that supports camera access.",
        );
        setStatus("error");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
        }
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setCameraError(cameraErrorMessage(err));
          setStatus("error");
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoEl) videoEl.srcObject = null;
    };
  }, []);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("The camera preview is not ready. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Could not capture the photo. Please try again.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Could not capture the photo. Please try again.");
          return;
        }
        onCapture(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-950">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Live camera preview"
          className={`h-full w-full object-cover ${status === "error" ? "hidden" : ""}`}
        />
        {status === "starting" && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950 text-xs font-medium text-white"
          >
            <Camera className="h-5 w-5" aria-hidden="true" />
            Starting camera…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-xs text-neutral-300">
            <CameraOff className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            <p>{cameraError}</p>
          </div>
        )}
      </div>
      {status !== "error" && cameraError && (
        <p className="text-xs font-medium text-red-700 dark:text-red-400" role="alert">
          {cameraError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={status !== "ready"}
          onClick={captureFrame}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden="true" />
          Capture photo
        </button>
      </div>
    </div>
  );
}

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
  const { data: buildings } = useBuildings();
  const buildingOptions = buildings?.map((entry) => entry.name) ?? ITEM_BUILDINGS;
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
  const [evidencePhotos, setEvidencePhotos] = useState<EvidencePhoto[]>(() =>
    (request.evidence ?? []).map((url) => ({ url, preview: url })),
  );
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() =>
    window.matchMedia("(max-width: 767px)").matches,
  );
  const evidencePreviewUrls = useRef<string[]>([]);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);

  const isFoundReport = request.kind === "return";
  const isBusy = isSaving || isUploading;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileView(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(
    () => () => {
      evidencePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const handleEvidenceChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/"),
    );
    const remainingSlots = Math.max(
      0,
      MAX_EVIDENCE_IMAGES - evidencePhotos.length,
    );
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    const newPhotos = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    evidencePreviewUrls.current.push(
      ...newPhotos.map(({ preview }) => preview),
    );
    if (newPhotos.length > 0) {
      setEvidencePhotos((current) => [...current, ...newPhotos]);
    }

    if (imageFiles.length !== selectedFiles.length) {
      setError("Only image files can be used as picture evidence.");
    } else if (filesToAdd.length < imageFiles.length) {
      setError(`You can add up to ${MAX_EVIDENCE_IMAGES} pictures.`);
    } else {
      setError("");
    }

    event.target.value = "";
  };

  const handleCapturedBlob = (blob: Blob) => {
    if (evidencePhotos.length >= MAX_EVIDENCE_IMAGES) {
      setError(`You can add up to ${MAX_EVIDENCE_IMAGES} pictures.`);
      setCameraOpen(false);
      return;
    }
    const preview = URL.createObjectURL(blob);
    evidencePreviewUrls.current.push(preview);
    setEvidencePhotos((current) => [...current, { file: blob, preview }]);
    setCameraOpen(false);
    setError("");
  };

  const handleMobileCaptureChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files can be used as picture evidence.");
      return;
    }
    handleCapturedBlob(file);
  };

  const handleRemoveEvidence = (indexToRemove: number) => {
    const photo = evidencePhotos[indexToRemove];
    if (photo?.file) {
      URL.revokeObjectURL(photo.preview);
      evidencePreviewUrls.current = evidencePreviewUrls.current.filter(
        (url) => url !== photo.preview,
      );
    }
    setEvidencePhotos((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) return;
    if (
      !claimantTitle.trim() ||
      !dateLost ||
      !timeLost ||
      !location.trim() ||
      !importantDetails.trim()
    ) {
      setError("Complete each required field before saving.");
      return;
    }
    if (evidencePhotos.length > MAX_EVIDENCE_IMAGES) {
      setError(`Remove pictures until there are ${MAX_EVIDENCE_IMAGES} or fewer.`);
      return;
    }

    try {
      setError("");
      setIsUploading(true);
      const filesToUpload = evidencePhotos.flatMap((photo) =>
        photo.file ? [photo.file] : [],
      );
      const uploadedUrls =
        filesToUpload.length > 0 ? await uploadImages(filesToUpload) : [];
      if (uploadedUrls.length !== filesToUpload.length) {
        throw new Error("Some photos couldn't be uploaded. Please try again.");
      }

      let uploadedIndex = 0;
      const evidence: string[] = [];
      for (const photo of evidencePhotos) {
        if (photo.url) {
          evidence.push(photo.url);
        } else if (photo.file) {
          evidence.push(uploadedUrls[uploadedIndex++]);
        }
      }
      await onSave({
        claimantTitle: claimantTitle.trim(),
        color: color.trim() || undefined,
        building: building.trim() || undefined,
        dateLost,
        timeLost,
        location: location.trim(),
        details: details.trim(),
        importantDetails: importantDetails.trim(),
        evidence,
      });
    } catch (saveError) {
      const message = (
        saveError as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setError(message ?? "We couldn't save your changes. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
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
          </div>
          <button
            aria-label="Close edit form"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            disabled={isBusy}
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <section
          aria-labelledby="edit-request-evidence-label"
          className="mt-6"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3
                id="edit-request-evidence-label"
                className={labelClass}
              >
                Picture evidence
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isFoundReport
                  ? `Capture photos with your camera. Up to ${MAX_EVIDENCE_IMAGES} total.`
                  : `Replace or add photos. Up to ${MAX_EVIDENCE_IMAGES} total.`}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
              {evidencePhotos.length}/{MAX_EVIDENCE_IMAGES}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            {evidencePhotos.map((photo, index) => (
              <div
                key={`${photo.preview}-${index}`}
                className="relative h-20 w-20 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
              >
                <img
                  src={photo.preview}
                  alt={`Picture evidence ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove picture evidence ${index + 1}`}
                  disabled={isBusy}
                  onClick={() => handleRemoveEvidence(index)}
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-950/75 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {evidencePhotos.length < MAX_EVIDENCE_IMAGES &&
              (isFoundReport ? (
                isMobileView ? (
                  <>
                    <input
                      ref={mobileCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      disabled={isBusy}
                      aria-label="Take a photo with your camera"
                      onChange={handleMobileCaptureChange}
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => mobileCameraInputRef.current?.click()}
                      className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
                    >
                      <Camera aria-hidden="true" className="h-5 w-5" />
                      <span className="text-[10px] font-bold">Take photo</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setCameraOpen((open) => !open)}
                    className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
                  >
                    <Camera aria-hidden="true" className="h-5 w-5" />
                    <span className="text-[10px] font-bold">Take photo</span>
                  </button>
                )
              ) : (
                <label
                  htmlFor="edit-request-evidence"
                  className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-neutral-500 hover:bg-neutral-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
                >
                  <ImagePlus aria-hidden="true" className="h-5 w-5" />
                  <span className="text-[10px] font-bold">Add photo</span>
                  <input
                    id="edit-request-evidence"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    disabled={isBusy}
                    onChange={handleEvidenceChange}
                  />
                </label>
              ))}
          </div>
          {isFoundReport &&
            !isMobileView &&
            cameraOpen &&
            evidencePhotos.length < MAX_EVIDENCE_IMAGES && (
              <LiveFoundCameraCapture
                onCapture={handleCapturedBlob}
                onClose={() => setCameraOpen(false)}
              />
            )}
        </section>

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
              disabled={isBusy}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-request-color">
              Primary color
            </label>
            <input
              id="edit-request-color"
              className={inputClass}
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="Black…"
              autoComplete="off"
              spellCheck={false}
              disabled={isBusy}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-request-date">
              Date {isFoundReport ? "found" : "lost"}
            </label>
            <input
              id="edit-request-date"
              required
              type="date"
              max={localTodayDate()}
              className={`${inputClass} cursor-pointer dark:[color-scheme:dark]`}
              value={dateLost}
              onChange={(event) => setDateLost(event.target.value)}
              disabled={isBusy}
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
              className={`${inputClass} cursor-pointer dark:[color-scheme:dark]`}
              value={timeLost}
              onChange={(event) => setTimeLost(event.target.value)}
              disabled={isBusy}
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
              disabled={isBusy}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-request-building">
              Building
            </label>
            <SelectDropdown
              id="edit-request-building"
              className={inputClass}
              value={building}
              onChange={setBuilding}
              options={buildingOptions.map((buildingOption) => ({
                value: buildingOption,
                label: buildingOption,
              }))}
              placeholder="Select a building"
              allowEmpty
              disabled={isBusy}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass} htmlFor="edit-request-description">
            Description
          </label>
          <textarea
            id="edit-request-description"
            rows={4}
            className={textareaClass}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Describe the item's appearance"
            disabled={isBusy}
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
            disabled={isBusy}
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
            disabled={isBusy}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="h-11 rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            disabled={isBusy}
            type="submit"
          >
            {isUploading
              ? "Uploading photos…"
              : isSaving
                ? "Saving…"
                : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
