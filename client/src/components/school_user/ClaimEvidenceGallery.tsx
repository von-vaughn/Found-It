import React from "react";

interface ClaimEvidenceGalleryProps {
  images?: string[];
  altPrefix: string;
  className?: string;
}

/** At most this many evidence pictures are shown. */
export const MAX_VISIBLE_EVIDENCE = 4;

export const ClaimEvidenceGallery: React.FC<ClaimEvidenceGalleryProps> = ({
  images,
  altPrefix,
  className = "",
}) => {
  const visible = (images ?? []).slice(0, MAX_VISIBLE_EVIDENCE);
  if (visible.length === 0) return null;
  const [first, ...rest] = visible;

  return (
    <div className={className}>
      <img
        src={first}
        alt={`${altPrefix} evidence 1`}
        loading="lazy"
        className="aspect-[16/10] w-full rounded-xl border border-neutral-200/80 object-cover"
      />
      {rest.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {rest.map((image, index) => (
            <img
              key={`${altPrefix}-evidence-${index + 2}`}
              src={image}
              alt={`${altPrefix} evidence ${index + 2}`}
              loading="lazy"
              className="aspect-square w-full rounded-lg border border-neutral-200/80 object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
};
