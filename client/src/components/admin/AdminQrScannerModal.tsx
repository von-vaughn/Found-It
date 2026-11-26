import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";
import { Camera, CameraOff, ScanLine, X } from "lucide-react";
import { parsePickupQrPayload } from "@/lib/pickupQr";

interface AdminQrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (targetPath: string) => void;
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
}

type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorLike;

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera access was denied. Allow camera access in your browser settings, then try again.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "No camera was found on this device. You can also search by the 8-character Ref Code.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is already in use by another app. Close it and try again.";
    }
  }
  return "The camera could not be started. Check your webcam connection or search by the 8-character Ref Code.";
}

export function AdminQrScannerModal({
  open,
  onClose,
  onScanSuccess,
}: AdminQrScannerModalProps) {
  if (!open || typeof document === "undefined") return null;
  return (
    <AdminQrScannerDialog onClose={onClose} onScanSuccess={onScanSuccess} />
  );
}

function AdminQrScannerDialog({
  onClose,
  onScanSuccess,
}: Omit<AdminQrScannerModalProps, "open">) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);

  const [cameraState, setCameraState] = useState<
    "starting" | "ready" | "error"
  >("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let lastScanMs = 0;
    let isDetectingFrame = false;
    const videoElement = videoRef.current;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    let nativeDetector: BarcodeDetectorLike | null = null;
    const DetectorCtor = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;
    if (DetectorCtor) {
      try {
        nativeDetector = new DetectorCtor({ formats: ["qr_code"] });
      } catch {
        nativeDetector = null;
      }
    }

    const handleRawDetection = (rawValue: string): boolean => {
      const parsed = parsePickupQrPayload(rawValue, window.location.origin);
      if (!parsed) {
        setScanError(
          "This QR code is not a valid Found-It claim or return pickup pass.",
        );
        return false;
      }
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
      onScanSuccessRef.current(parsed.targetPath);
      return true;
    };

    const scanTick = (timestamp: number) => {
      if (cancelled) return;
      rafId = window.requestAnimationFrame(scanTick);

      if (timestamp - lastScanMs < 110 || isDetectingFrame) return;
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        return;
      }
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width === 0 || height === 0) return;

      lastScanMs = timestamp;

      if (nativeDetector) {
        isDetectingFrame = true;
        void nativeDetector
          .detect(video)
          .then((codes) => {
            if (cancelled) return;
            for (const entry of codes) {
              if (entry.rawValue && handleRawDetection(entry.rawValue)) {
                return;
              }
            }
          })
          .catch(() => {
            nativeDetector = null;
          })
          .finally(() => {
            isDetectingFrame = false;
          });
        return;
      }

      if (!context) return;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const decoded = jsQR(imageData.data, width, height, {
        inversionAttempts: "attemptBoth",
      });
      if (decoded?.data) {
        handleRawDetection(decoded.data);
      }
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError(
            "Camera access is unavailable. Use a secure connection and a browser that supports camera access.",
          );
          setCameraState("error");
        }
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const currentVideo = videoRef.current;
        if (!currentVideo) {
          stopStream(stream);
          return;
        }
        currentVideo.srcObject = stream;
        await currentVideo.play().catch(() => {});
        if (!cancelled) {
          setCameraState("ready");
          rafId = window.requestAnimationFrame(scanTick);
        }
      } catch (error) {
        stopStream(stream);
        if (streamRef.current === stream) streamRef.current = null;
        if (!cancelled) {
          setCameraError(getCameraErrorMessage(error));
          setCameraState("error");
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      stopStream(streamRef.current);
      streamRef.current = null;
      stopStream(stream);
      if (videoElement) videoElement.srcObject = null;
    };
  }, []);

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-neutral-950/70 p-4 backdrop-blur-xs"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-qr-scanner-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close QR scanner"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 pr-8">
          <ScanLine
            className="h-5 w-5 shrink-0 text-[#E5192D]"
            aria-hidden="true"
          />
          <h2
            id="admin-qr-scanner-title"
            className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            Scan Pickup QR Pass
          </h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          Hold the student&apos;s approved pickup QR code in front of your
          camera to open the request directly.
        </p>

        <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="QR code camera scanner"
            className={`h-full w-full object-cover ${
              cameraState === "error" ? "hidden" : ""
            }`}
          />

          {cameraState === "ready" && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="h-44 w-44 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}

          {cameraState === "starting" && (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950 text-xs font-medium text-white"
            >
              <Camera className="h-6 w-6" aria-hidden="true" />
              Starting camera…
            </div>
          )}

          {cameraState === "error" && (
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-xs leading-relaxed text-white"
            >
              <CameraOff
                className="h-6 w-6 text-neutral-300"
                aria-hidden="true"
              />
              <p>{cameraError}</p>
            </div>
          )}
        </div>

        {scanError && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {scanError}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
