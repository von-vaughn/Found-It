import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { NoItemImage } from "@/components/NoItemImage";

export interface CarouselPhoto {
  src: string;
  alt: string;
}

interface PhotoCarouselProps {
  photos: ReadonlyArray<CarouselPhoto>;
  emptyTitle?: string;
  emptySubtitle?: string;
}

/** Single-photo carousel with below-image switchers, click-to-zoom modal, and matched empty state. */
export function PhotoCarousel({
  photos,
  emptyTitle = "No photo evidence provided",
  emptySubtitle = "No photos were attached to this request.",
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      } else if (event.key === "ArrowLeft" && photos.length > 1) {
        setIndex((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (event.key === "ArrowRight" && photos.length > 1) {
        setIndex((prev) => (prev + 1) % photos.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen, photos.length]);

  if (photos.length === 0) {
    return (
      <NoItemImage
        title={emptyTitle}
        subtitle={emptySubtitle}
        className="h-80 sm:h-96"
      />
    );
  }

  const safeIndex = index < photos.length ? index : 0;
  const activePhoto = photos[safeIndex];
  const hasMultiple = photos.length > 1;
  const showPrev = () =>
    setIndex((safeIndex - 1 + photos.length) % photos.length);
  const showNext = () => setIndex((safeIndex + 1) % photos.length);

  return (
    <>
      <div className="flex h-80 sm:h-96 w-full flex-col overflow-hidden rounded-lg bg-neutral-50 dark:bg-neutral-800">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={`View full image: ${activePhoto.alt}`}
          className="min-h-0 flex-1 w-full cursor-zoom-in p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D]"
        >
          <img
            src={activePhoto.src}
            alt={activePhoto.alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain"
          />
        </button>
        {hasMultiple && (
          <div className="flex shrink-0 items-center justify-between px-3 py-2">
            <button
              type="button"
              onClick={showPrev}
              aria-label="Previous photo"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-800 shadow-xs ring-1 ring-neutral-200 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-700 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="font-mono text-xs font-semibold text-neutral-600 tabular-nums dark:text-neutral-300">
              {safeIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={showNext}
              aria-label="Next photo"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-800 shadow-xs ring-1 ring-neutral-200 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-700 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {previewOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={activePhoto.alt}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPreviewOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          >
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              aria-label="Close image preview"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  aria-label="Previous photo"
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Next photo"
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            )}
            <img
              src={activePhoto.src}
              alt={activePhoto.alt}
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
