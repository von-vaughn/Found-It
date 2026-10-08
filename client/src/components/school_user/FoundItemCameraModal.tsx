import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Camera,
  CameraOff,
  CheckCircle2,
  MapPin,
  RotateCcw,
  X,
} from "lucide-react";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";

interface FoundItemCameraModalProps {
  onClose: () => void;
}

type CameraState = "starting" | "ready" | "error";
type ModalStep = "camera" | "details" | "confirmation";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm transition-colors focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500";

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

export const FoundItemCameraModal: React.FC<FoundItemCameraModalProps> = ({
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [step, setStep] = useState<ModalStep>("camera");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [building, setBuilding] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "camera" || capturedPhoto) return;

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
  }, [step, capturedPhoto]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      setCapturedPhoto(URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  };

  const handleRetake = () => {
    setCameraState("starting");
    setCameraError(null);
    setCapturedPhoto(null);
    setCaptureError(null);
    setStep("camera");
  };

  const handleDetailsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim() || !location.trim()) {
      setFormError("Enter a description and specific location to continue.");
      return;
    }
    setFormError(null);
    setStep("confirmation");
  };

  const title =
    step === "camera"
      ? "Photograph the found item"
      : step === "details"
        ? "Describe the item found"
        : "Next step: bring it to OSA";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-neutral-950/70 p-4">
      <button
        type="button"
        aria-label="Close found item flow"
        onClick={onClose}
        className="fixed inset-0 cursor-default"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="found-item-camera-title"
        className="relative z-10 my-6 w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="found-item-camera-title"
              className="text-base font-bold text-neutral-900"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {step === "camera"
                ? "Capture a photo to review. It won’t be sent or submitted."
                : step === "details"
                  ? "Add a description and where you found it. These details won’t be published."
                  : "Your details have not been published or sent."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close found item flow"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {step === "camera" && (
          <div className="space-y-4 p-5 sm:p-6">
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
              <p role="alert" className="text-sm font-medium text-red-700">
                {captureError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("details")}
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
          </div>
        )}

        {step === "details" && (
          <form
            onSubmit={handleDetailsSubmit}
            className="space-y-5 p-5 sm:p-6"
          >
            {formError && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {formError}
              </p>
            )}
            {capturedPhoto && (
              <img
                src={capturedPhoto}
                alt="Captured found-item photo"
                className="h-36 w-full rounded-xl bg-neutral-100 object-contain"
              />
            )}
            <div>
              <label htmlFor="found-item-description" className={labelClass}>
                Describe the item
              </label>
              <textarea
                id="found-item-description"
                name="description"
                required
                rows={3}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setFormError(null);
                }}
                placeholder="Add details that may help identify the item"
                className={`${inputClass} min-h-24 resize-y`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="found-item-location" className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Specific location
                  </span>
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
              <div>
                <label htmlFor="found-item-building" className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Building
                  </span>
                </label>
                <select
                  id="found-item-building"
                  name="building"
                  value={building}
                  onChange={(event) => setBuilding(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a building</option>
                  {ITEM_BUILDINGS.map((buildingOption) => (
                    <option key={buildingOption} value={buildingOption}>
                      {buildingOption}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep("camera")}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to photo
              </button>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-xl bg-[#E5192D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                Submit details
              </button>
            </div>
          </form>
        )}

        {step === "confirmation" && (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-6 w-6 shrink-0 text-green-700"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  Please bring the found item to the Office of Student Affairs
                  (OSA).
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  The OSA can help reunite it with its owner. Your photo and
                  details have only been kept in this session; they were not
                  submitted or shared.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-xl bg-[#E5192D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
