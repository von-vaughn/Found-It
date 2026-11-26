import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Download, Maximize2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  buildPickupQrUrl,
  formatPickupReferenceCode,
  type PickupRequestKind,
} from "@/lib/pickupQr";

interface PickupQrCardProps {
  kind: PickupRequestKind;
  requestId: string;
  itemName: string;
}

export function PickupQrCard({
  kind,
  requestId,
  itemName,
}: PickupQrCardProps) {
  const [enlargedOpen, setEnlargedOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrSvgRef = useRef<SVGSVGElement>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const qrValue = buildPickupQrUrl(origin, kind, requestId);
  const referenceCode = formatPickupReferenceCode(requestId);

  useEffect(() => {
    if (!enlargedOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setEnlargedOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enlargedOpen]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable in insecure contexts
    }
  };

  const handleDownloadQr = () => {
    const svgEl = qrSvgRef.current;
    if (!svgEl || downloading) return;
    setDownloading(true);

    const serialized = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      try {
        const width = 640;
        const height = 780;
        const qrSize = 480;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.error("Could not generate QR image.");
          return;
        }

        // White pass card background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Header label
        ctx.fillStyle = "#047857";
        ctx.font = "700 22px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("OSA PICKUP PASS", width / 2, 56);

        // Item name (truncated if long)
        ctx.fillStyle = "#171717";
        ctx.font = "700 28px system-ui, -apple-system, sans-serif";
        const displayTitle =
          itemName.length > 34 ? `${itemName.slice(0, 33)}…` : itemName;
        ctx.fillText(displayTitle, width / 2, 98);

        // Crisp QR code
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, (width - qrSize) / 2, 128, qrSize, qrSize);

        // Reference code & School ID reminder
        ctx.fillStyle = "#171717";
        ctx.font = "700 26px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(`REF #${referenceCode}`, width / 2, 666);

        ctx.fillStyle = "#525252";
        ctx.font = "500 20px system-ui, -apple-system, sans-serif";
        ctx.fillText(
          "Present this pass and your School ID at the OSA office.",
          width / 2,
          714,
        );

        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `found-it-pickup-${referenceCode.toLowerCase()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Pickup QR pass downloaded.");
      } catch {
        toast.error("Could not download the QR code. Please try again.");
      } finally {
        URL.revokeObjectURL(svgUrl);
        setDownloading(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      setDownloading(false);
      toast.error("Could not download the QR code. Please try again.");
    };
    img.src = svgUrl;
  };

  return (
    <>
      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-emerald-200/80 bg-white/90 p-3 sm:flex-row sm:items-center dark:border-emerald-800/50 dark:bg-neutral-900/85">
        <button
          type="button"
          onClick={() => setEnlargedOpen(true)}
          aria-label={`Enlarge pickup QR code for ${itemName}`}
          title="Tap to enlarge QR code"
          className="group relative mx-auto shrink-0 rounded-lg border border-neutral-200 bg-white p-2 shadow-xs transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:mx-0 cursor-pointer"
        >
          <QRCodeSVG
            ref={qrSvgRef}
            value={qrValue}
            size={88}
            level="M"
            marginSize={1}
            bgColor="#FFFFFF"
            fgColor="#171717"
          />
          <span className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-neutral-600 group-hover:text-neutral-900">
            <Maximize2 className="h-2.5 w-2.5" aria-hidden="true" />
            Enlarge
          </span>
        </button>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            OSA Pickup QR Pass
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            Present this QR code and your valid{" "}
            <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
              School ID
            </strong>{" "}
            at the OSA desk for verification.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
              <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Ref
              </span>
              <code className="font-mono text-xs font-bold tracking-wider text-neutral-900 dark:text-neutral-100">
                #{referenceCode}
              </code>
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                aria-label="Copy reference code"
                title="Copy reference code"
                className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 cursor-pointer"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
            </div>

            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadQr}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-55 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50 cursor-pointer"
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              {downloading ? "Saving…" : "Download QR"}
            </button>
          </div>
        </div>
      </div>

      {enlargedOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setEnlargedOpen(false);
            }}
            className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-neutral-950/70 p-4 backdrop-blur-xs"
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`pickup-qr-title-${requestId}`}
              className="relative flex w-full max-w-[360px] flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center text-neutral-900 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <button
                type="button"
                onClick={() => setEnlargedOpen(false)}
                aria-label="Close QR pass"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                OSA Pickup Pass
              </p>
              <h3
                id={`pickup-qr-title-${requestId}`}
                className="mt-1 max-w-full truncate px-6 text-base font-extrabold text-neutral-900 dark:text-neutral-100"
              >
                {itemName}
              </h3>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
                <QRCodeSVG
                  value={qrValue}
                  size={232}
                  level="M"
                  marginSize={2}
                  bgColor="#FFFFFF"
                  fgColor="#171717"
                />
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Ref Code
                </span>
                <code className="font-mono text-sm font-extrabold tracking-widest text-neutral-900 dark:text-neutral-100">
                  #{referenceCode}
                </code>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                Show this screen to OSA staff along with your physical{" "}
                <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
                  School ID
                </strong>
                .
              </p>

              <button
                type="button"
                disabled={downloading}
                onClick={handleDownloadQr}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {downloading ? "Saving…" : "Download QR Pass"}
              </button>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
