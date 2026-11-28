import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  RotateCcw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { SelectDropdown } from "@/components/SelectDropdown";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { useBuildings } from "@/hooks/useBuildings";
import { useCreateReturnRequest } from "@/hooks/useReturns";
import { uploadImage } from "@/services/itemService";
import { localTodayDate } from "@/lib/date";

interface FoundReportFlowProps {
  active: boolean;
  onExit: () => void;
  framed?: boolean;
  step: FoundFlowStep;
  onStepChange: (step: FoundFlowStep) => void;
  lostItemId: string;
  lostItemTitle: string;
}

type CameraState = "starting" | "ready" | "error";
export type FoundFlowStep = "camera" | "details" | "confirmation";

const inputClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 px-3.5 py-3 text-sm transition-colors focus:border-neutral-400 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 dark:focus-visible:ring-neutral-700";

const labelClass =
  "mb-1.5 block text-[11px] font-bold capitalize text-neutral-500 dark:text-neutral-400";

function useIsMobileView(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isMobile;
}

function stopCameraStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function getCameraErrorMessage(error: unknown): string {
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

export const FoundReportFlow: React.FC<FoundReportFlowProps> = ({
  active,
  onExit,
  framed = true,
  step,
  onStepChange,
  lostItemId,
  lostItemTitle,
}) => {
  const isMobileView = useIsMobileView();
  const { data: buildings } = useBuildings();
  const buildingOptions = buildings?.map((entry) => entry.name) ?? ITEM_BUILDINGS;
  const createReturnRequest = useCreateReturnRequest();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<Blob | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState(lostItemTitle);
  const [color, setColor] = useState("");
  const [dateFound, setDateFound] = useState("");
  const [timeFound, setTimeFound] = useState("");
  const [description, setDescription] = useState("");
  const [importantDetails, setImportantDetails] = useState("");
  const [location, setLocation] = useState("");
  const [building, setBuilding] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live camera preview (desktop only — mobile uses the native camera
  // input instead).
  useEffect(() => {
    if (!active || step !== "camera" || capturedPhoto || isMobileView) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    const videoElement = videoRef.current;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera access is unavailable. Use a secure connection and a browser that supports camera access.",
        );
        setCameraState("error");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stopCameraStream(stream);
          return;
        }

        streamRef.current = stream;
        if (!videoElement) {
          throw new Error("Camera preview element is unavailable.");
        }
        videoElement.srcObject = stream;
        await videoElement.play();
        if (!cancelled) setCameraState("ready");
      } catch (error) {
        stopCameraStream(stream);
        if (streamRef.current === stream) streamRef.current = null;
        stream = null;
        if (!cancelled) {
          setCameraError(getCameraErrorMessage(error));
          setCameraState("error");
        }
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      const activeStream = streamRef.current;
      streamRef.current = null;
      stopCameraStream(activeStream);
      if (stream !== activeStream) stopCameraStream(stream);
      if (videoElement) videoElement.srcObject = null;
    };
  }, [active, step, capturedPhoto, isMobileView]);

  useEffect(() => {
    if (!capturedPhoto) return;
    return () => URL.revokeObjectURL(capturedPhoto);
  }, [capturedPhoto]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCaptureError("The camera preview is not ready. Try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCaptureError("Could not capture the photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCaptureError("Could not capture the photo. Please try again.");
        return;
      }
      setCaptureError(null);
      setCapturedFile(blob);
      setCapturedPhoto(URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  };

  const handleNativeFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCaptureError("Please choose an image file.");
      return;
    }
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
    setCaptureError(null);
    setCapturedFile(file);
    setCapturedPhoto(URL.createObjectURL(file));
    event.target.value = "";
  };

  const handleRetake = () => {
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
    setCameraState("starting");
    setCameraError(null);
    setCapturedFile(null);
    setCapturedPhoto(null);
    setCaptureError(null);
    onStepChange("camera");
  };

  const handleDetailsSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (isSubmitting || isSubmittingRef.current) return;
    if (
      !itemTitle.trim() ||
      !importantDetails.trim() ||
      !location.trim() ||
      !dateFound ||
      !timeFound
    ) {
      setFormError(
        "Enter a title, important details, location found, date found, and approximate time found to continue.",
      );
      return;
    }
    setFormError(null);
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const evidence = capturedFile
        ? [await uploadImage(capturedFile, "found-item.jpg")]
        : [];
      await createReturnRequest.mutateAsync({
        itemId: lostItemId,
        claimantTitle: itemTitle.trim(),
        color: color.trim() || undefined,
        building: building.trim() || undefined,
        dateLost: dateFound,
        timeLost: timeFound,
        location: location.trim(),
        details: description.trim(),
        importantDetails: importantDetails.trim(),
        evidence,
      });
      toast.success("Found report submitted.");
      onStepChange("confirmation");
    } catch (error) {
      const data = (
        error as {
          response?: {
            data?: { message?: string; errors?: { message?: string }[] };
          };
        }
      )?.response?.data;
      console.error("Failed to submit found report.", error);
      setFormError(
        data?.errors?.[0]?.message ??
          data?.message ??
          "We couldn't submit your found report. Please try again.",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const title =
    step === "camera"
      ? "Photograph the found item"
      : step === "details"
        ? "Describe the item found"
        : "What Happens Next?";

  return (
    <section
      aria-labelledby="found-report-title"
      className={
        framed
          ? "w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl"
          : "w-full"
      }
    >
      <header
        className={`flex items-center justify-between gap-4 px-5 sm:px-6 ${
          step === "confirmation"
            ? "pt-5 pb-0"
            : "border-b border-neutral-200 py-4 dark:border-neutral-800"
        }`}
      >
        <div className="min-w-0">
          <h2
            id="found-report-title"
            className="text-base font-bold text-neutral-900 dark:text-neutral-100"
          >
            {title}
          </h2>
          {step === "camera" && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Take a photo of the item.
            </p>
          )}
        </div>
        {framed && (
          <button
            type="button"
            onClick={onExit}
            aria-label="Close found item flow"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </header>

      {step === "camera" && (
        <div className="space-y-4 p-5 sm:p-6">
          {isMobileView ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNativeFileChange}
                className="sr-only"
                aria-label="Take a photo with your camera"
                tabIndex={-1}
              />
              {capturedPhoto ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-950">
                  <img
                    src={capturedPhoto}
                    alt="Captured photo of the found item"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3 text-center transition-colors hover:border-neutral-400 hover:bg-neutral-100/60 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
                >
                  <Camera
                    className="h-6 w-6 text-neutral-300"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Take a photo
                  </span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    Opens your camera
                  </span>
                </button>
              )}

              {captureError && (
                <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
                  {captureError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {capturedPhoto ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={() => onStepChange("details")}
                      className="inline-flex h-10 items-center rounded-xl bg-[#E5192D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                    >
                      Continue
                    </button>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-950">
                {capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt="Captured photo of the found item"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    aria-label="Live camera preview"
                    className={`h-full w-full object-cover ${
                      cameraState === "error" ? "hidden" : ""
                    }`}
                  />
                )}

                {cameraState === "starting" && !capturedPhoto && (
                  <div
                    role="status"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 text-sm font-medium text-white"
                  >
                    <Camera className="h-6 w-6" aria-hidden="true" />
                    Starting camera…
                  </div>
                )}
                {cameraState === "error" && !capturedPhoto && (
                  <div
                    role="alert"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center text-sm text-white"
                  >
                    <CameraOff
                      className="h-7 w-7 text-neutral-300"
                      aria-hidden="true"
                    />
                    <p>{cameraError}</p>
                  </div>
                )}
              </div>

              {captureError && (
                <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
                  {captureError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {capturedPhoto ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={() => onStepChange("details")}
                      className="inline-flex h-10 items-center rounded-xl bg-[#E5192D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                    >
                      Continue
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={cameraState !== "ready"}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#E5192D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    Capture photo
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {step === "details" && (
        <form
          onSubmit={handleDetailsSubmit}
          className="space-y-5 p-5 sm:p-6"
        >
          <div className="min-w-0 space-y-5">
          <div>
            <label htmlFor="found-item-title" className={labelClass}>
              What is it? <span className="text-[#E5192D]" aria-hidden="true">*</span>
            </label>
            <input
              id="found-item-title"
              name="title"
              type="text"
              required
              value={itemTitle}
              onChange={(event) => {
                setItemTitle(event.target.value);
                setFormError(null);
              }}
              placeholder="Black backpack, iPhone 13…"
              autoComplete="off"
              spellCheck={false}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="found-item-color" className={labelClass}>
                Primary color
              </label>
              <input
                id="found-item-color"
                name="color"
                type="text"
                value={color}
                onChange={(event) => {
                  setColor(event.target.value);
                  setFormError(null);
                }}
                placeholder="Black…"
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="found-item-date" className={labelClass}>
                Date found <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <input
                id="found-item-date"
                name="dateFound"
                type="date"
                required
                value={dateFound}
                max={localTodayDate()}
                onChange={(event) => {
                  setDateFound(event.target.value);
                  setFormError(null);
                }}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="found-item-time" className={labelClass}>
                Approximate time found <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <input
                id="found-item-time"
                name="timeFound"
                type="time"
                required
                value={timeFound}
                onChange={(event) => {
                  setTimeFound(event.target.value);
                  setFormError(null);
                }}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>
            <div>
              <label htmlFor="found-item-location" className={labelClass}>
                Location found <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <input
                id="found-item-location"
                name="location"
                type="text"
                required
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  setFormError(null);
                }}
                placeholder="Where did you find it?"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="found-item-building" className={labelClass}>
              Building
            </label>
            <SelectDropdown
              id="found-item-building"
              value={building}
              onChange={setBuilding}
              options={buildingOptions.map((buildingOption) => ({
                value: buildingOption,
                label: buildingOption,
              }))}
              placeholder="Select a building"
              allowEmpty
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="found-item-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="found-item-description"
              name="description"
              rows={3}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setFormError(null);
              }}
              placeholder="Describe the item's appearance"
              className={`${inputClass} min-h-24 resize-y`}
            />
          </div>

          <div>
            <label htmlFor="found-item-important-details" className={labelClass}>
              Important details <span className="text-[#E5192D]" aria-hidden="true">*</span>
            </label>
            <textarea
              id="found-item-important-details"
              name="importantDetails"
              required
              rows={3}
              value={importantDetails}
              onChange={(event) => {
                setImportantDetails(event.target.value);
                setFormError(null);
              }}
              placeholder="Unique mark only the owner would know…"
              className={`${inputClass} min-h-24 resize-y`}
            />
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
              onClick={() => onStepChange("camera")}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c91424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit details"}
            </button>
          </div>
        </form>
      )}

      {step === "confirmation" && (
        <div className="space-y-6 px-5 pt-2 pb-5 sm:px-6 sm:pb-6">
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Bring the item to OSA for verification and safekeeping.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-10 items-center rounded-xl bg-[#E5192D] px-5 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
