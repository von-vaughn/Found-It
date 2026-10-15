export const MAX_POST_IMAGES = 4;

export function getRemainingImageSlots(currentCount: number): number {
  return Math.max(0, MAX_POST_IMAGES - currentCount);
}

type ImageLike = { type: string };

export function selectAddableImageFiles<T extends ImageLike>(
  currentCount: number,
  files: readonly T[],
): T[] {
  const remaining = getRemainingImageSlots(currentCount);
  if (remaining === 0) return [];
  return files
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, remaining);
}
