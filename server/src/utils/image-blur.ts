import sharp from 'sharp';

/**
 * Standard configuration for server-side blurring of found item images:
 * - `.rotate()`: Automatically orient image using EXIF orientation metadata.
 * - `.resize(800, 800)`: Standardizes the coordinate space so blur radius
 *   provides identical, predictable detail destruction regardless of camera resolution,
 *   while reducing file size and network latency.
 * - `.blur(28)`: Strong Gaussian blur (sigma 28) destroying high-frequency features
 *   (student ID text, card numbers, phone lockscreens, scratches, stickers, serials).
 * - `.jpeg({ quality: 80, progressive: true })`: Strips all EXIF metadata (GPS/timestamps)
 *   and outputs an optimized standard JPEG.
 */
export async function generateBlurredImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .blur(28)
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
}

/**
 * Fetches an image buffer from a remote URL (such as Google Drive CDN).
 * Useful for legacy items or on-demand blur fallback.
 */
export async function fetchRemoteImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
