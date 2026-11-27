import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { SelectDropdown } from "@/components/SelectDropdown";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { useBuildings } from "@/hooks/useBuildings";
import { useIsMobileView } from "@/hooks/useIsMobileView";
import { useCreateWalkInReturn } from "@/hooks/useReturns";
import { localTodayDate } from "@/lib/date";
import { checkSchoolUserBySchoolId } from "@/services/claimService";
import { uploadImage } from "@/services/itemService";

interface WalkInReturnModalProps {
  open: boolean;
  itemId: string;
  itemTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

type WalkInStep = "camera" | "details" | "confirmation";
type CameraState = "starting" | "ready" | "error";
type WalkInMode = "account" | "guest";
type LookupState = "idle" | "checking" | "found" | "not_found";

const inputClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 px-3.5 py-3 text-sm transition-colors focus:border-neutral-400 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 dark:focus-visible:ring-neutral-700";

const labelClass =
  "mb-2 block text-xs font-bold text-neutral-700 dark:text-neutral-300";

function stopCameraStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Camera permission was denied. Allow camera access in your browser to photograph the found item.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No camera was found on this device. A live camera photo is required to record this found item.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Your camera is in use by another app. Close it and try again.";
    }
  }
  return "We could not start your camera. Check browser permissions and try again.";
}

export function WalkInReturnModal({
  open,
  itemId,
  itemTitle,
  onClose,
  onSuccess,
}: WalkInReturnModalProps) {
  const isMobileView = useIsMobileView();
  const [step, setStep] = useState<WalkInStep>("camera");

  // Exact live camera state from FoundReportFlow
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<Blob | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Walk-in finder identity state
  const [mode, setMode] = useState<WalkInMode>("account");
  const [accountSchoolId, setAccountSchoolId] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [contact, setContact] = useState("");

  // Exact return request fields from FoundReportFlow + required pickup instructions
  const [claimantTitle, setClaimantTitle] = useState(itemTitle);
  const [color, setColor] = useState("");
  const [dateFound, setDateFound] = useState("");
  const [timeFound, setTimeFound] = useState("");
  const [description, setDescription] = useState("");
  const [importantDetails, setImportantDetails] = useState("");
  const [location, setLocation] = useState("");
  const [building, setBuilding] = useState("");
  const [approvalInstructions, setApprovalInstructions] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const createWalkInReturn = useCreateWalkInReturn();
  const { data: buildings } = useBuildings();
  const buildingOptions =
    buildings?.map((entry) => entry.name) ?? ITEM_BUILDINGS;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Live camera preview (desktop only — mobile uses the native camera input instead).
  useEffect(() => {
    if (!open || step !== "camera" || capturedPhoto || isMobileView) return;

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
  }, [open, step, capturedPhoto, isMobileView]);

  useEffect(() => {
    if (!capturedPhoto) return;
    return () => URL.revokeObjectURL(capturedPhoto);
  }, [capturedPhoto]);

  // Privacy-safe School ID check for Has Account mode
  useEffect(() => {
    if (!open || step !== "details" || mode !== "account") return;
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
  }, [open, step, mode, accountSchoolId]);

  if (!open) return null;

  const busy = isSubmitting || createWalkInReturn.isPending;

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
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCaptureError("Could not capture the photo. Please try again.");
          return;
        }
        setCaptureError(null);
        setCapturedFile(blob);
        setCapturedPhoto(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92,
    );
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
    setStep("camera");
  };

  const handleDetailsSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFormError(null);

    if (mode === "account") {
      if (!accountSchoolId.trim()) {
        setFormError("Enter the School ID.");
        return;
      }
      if (lookupState !== "found" || !matchedUserId) {
        setFormError(
          'No registered account found for this School ID. Use "No Account" instead.',
        );
        return;
      }
    } else if (fullName.trim().length < 2) {
      setFormError("Enter the finder's full name.");
      return;
    }

    if (
      !claimantTitle.trim() ||
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

    const trimmedInstructions = approvalInstructions.trim();
    if (!trimmedInstructions) {
      setFormError("Enter pickup instructions for the owner.");
      return;
    }

    setIsSubmitting(true);
    try {
      const evidence = capturedFile
        ? [await uploadImage(capturedFile, "found-item.jpg")]
        : [];

      const commonPayload = {
        itemId,
        claimantTitle: claimantTitle.trim(),
        color: color.trim() || undefined,
        building: building.trim() || undefined,
        dateLost: dateFound,
        timeLost: timeFound,
        location: location.trim(),
        details: description.trim(),
        importantDetails: importantDetails.trim(),
        evidence,
        approvalInstructions: trimmedInstructions,
      };

      if (mode === "account") {
        await createWalkInReturn.mutateAsync({
          ...commonPayload,
          mode: "account",
          userId: matchedUserId!,
        });
      } else {
        await createWalkInReturn.mutateAsync({
          ...commonPayload,
          mode: "guest",
          fullName: fullName.trim(),
          schoolId: schoolId.trim() || undefined,
          contact: contact.trim() || undefined,
        });
      }
      toast.success("Walk-in return recorded.");
      setStep("confirmation");
    } catch (error) {
      const data = (
        error as {
          response?: {
            data?: { message?: string; errors?: { message?: string }[] };
          };
        }
      )?.response?.data;
      setFormError(
        data?.errors?.[0]?.message ??
          data?.message ??
          "We couldn't record the walk-in return. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    step === "camera"
      ? "Photograph the found item"
      : step === "details"
        ? "Describe the item found"
        : "Walk-In Return Recorded";

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="walkin-return-title"
      onCancel={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        if (step === "confirmation") {
          onSuccess();
        } else {
          onClose();
        }
      }}
      onClose={() => {
        if (step === "confirmation") {
          onSuccess();
        } else {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          if (step === "confirmation") {
            onSuccess();
          } else {
            onClose();
          }
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0 text-left text-neutral-900 dark:text-neutral-100 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs"
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
            id="walkin-return-title"
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
        <button
          type="button"
          onClick={() => (step === "confirmation" ? onSuccess() : onClose())}
          disabled={busy}
          aria-label="Close walk-in return flow"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
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
                <p
                  role="alert"
                  className="text-sm font-medium text-red-700 dark:text-red-400"
                >
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
                      onClick={() => setStep("details")}
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
                <p
                  role="alert"
                  className="text-sm font-medium text-red-700 dark:text-red-400"
                >
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
            </>
          )}
        </div>
      )}

      {step === "details" && (
        <form
          onSubmit={handleDetailsSubmit}
          className="max-h-[80vh] space-y-5 overflow-y-auto p-5 sm:p-6"
        >
          <div className="min-w-0 space-y-5">
            {/* Walk-In Finder Identity */}
            <div className="space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
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
                    setFormError(null);
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
                    setFormError(null);
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

              {mode === "account" ? (
                <div className="space-y-2">
                  <label htmlFor="walkin-return-school-id" className={labelClass}>
                    School ID <span className="text-[#E5192D]" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="walkin-return-school-id"
                    type="text"
                    value={accountSchoolId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAccountSchoolId(value);
                      setFormError(null);
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
                    <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                      Checking School ID…
                    </p>
                  )}
                  {lookupState === "found" && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Registered school user account found.
                    </p>
                  )}
                  {lookupState === "not_found" && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
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
                      Full Name <span className="text-[#E5192D]" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="walkin-return-guest-name"
                      type="text"
                      value={fullName}
                      onChange={(event) => {
                        setFullName(event.target.value);
                        setFormError(null);
                      }}
                      placeholder="e.g. Juan Dela Cruz"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="walkin-return-guest-id" className={labelClass}>
                        School ID{" "}
                        <span className="font-normal text-neutral-400">(optional)</span>
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
                        <span className="font-normal text-neutral-400">(optional)</span>
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
            </div>

            <div>
              <label htmlFor="walkin-found-item-title" className={labelClass}>
                What is it? <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <input
                id="walkin-found-item-title"
                name="title"
                type="text"
                required
                value={claimantTitle}
                onChange={(event) => {
                  setClaimantTitle(event.target.value);
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
                <label htmlFor="walkin-found-item-color" className={labelClass}>
                  Primary color
                </label>
                <input
                  id="walkin-found-item-color"
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
                <label htmlFor="walkin-found-item-date" className={labelClass}>
                  Date found <span className="text-[#E5192D]" aria-hidden="true">*</span>
                </label>
                <input
                  id="walkin-found-item-date"
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
                <label htmlFor="walkin-found-item-time" className={labelClass}>
                  Approximate time found{" "}
                  <span className="text-[#E5192D]" aria-hidden="true">*</span>
                </label>
                <input
                  id="walkin-found-item-time"
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
                <label htmlFor="walkin-found-item-location" className={labelClass}>
                  Location found{" "}
                  <span className="text-[#E5192D]" aria-hidden="true">*</span>
                </label>
                <input
                  id="walkin-found-item-location"
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
              <label htmlFor="walkin-found-item-building" className={labelClass}>
                Building
              </label>
              <SelectDropdown
                id="walkin-found-item-building"
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
              <label htmlFor="walkin-found-item-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="walkin-found-item-description"
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
              <label
                htmlFor="walkin-found-item-important-details"
                className={labelClass}
              >
                Important details{" "}
                <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <textarea
                id="walkin-found-item-important-details"
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

            <div>
              <label htmlFor="walkin-return-instructions" className={labelClass}>
                Pickup instructions for owner{" "}
                <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <input
                id="walkin-return-instructions"
                type="text"
                required
                maxLength={500}
                value={approvalInstructions}
                onChange={(event) => {
                  setApprovalInstructions(event.target.value);
                  setFormError(null);
                }}
                placeholder="e.g. Bring valid School ID to OSA Window 2, 8 AM–5 PM"
                className={inputClass}
              />
            </div>
          </div>

          {formError && (
            <p
              role="alert"
              className="text-sm font-medium text-red-700 dark:text-red-400"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setStep("camera")}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <button
              type="submit"
              disabled={busy || (mode === "account" && lookupState !== "found")}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c91424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Submitting..." : "Submit details"}
            </button>
          </div>
        </form>
      )}

      {step === "confirmation" && (
        <div className="space-y-6 px-5 pt-2 pb-5 sm:px-6 sm:pb-6">
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            The item has been marked as received by OSA and approved. The owner
            has been notified with their Pickup QR Pass.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSuccess}
              className="inline-flex h-10 items-center rounded-xl bg-[#E5192D] px-5 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
