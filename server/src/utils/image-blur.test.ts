import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { generateBlurredImage } from './image-blur';

describe('generateBlurredImage', () => {
  it('generates a valid blurred JPEG from an image buffer', async () => {
    // Create a 400x400 high-contrast test image (white text on black background)
    const svg = `
      <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#000000" />
        <text x="20" y="200" fill="#ffffff" font-size="40" font-family="sans-serif">CONFIDENTIAL 12345</text>
      </svg>
    `;
    const inputBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const blurredBuffer = await generateBlurredImage(inputBuffer);
    assert.ok(Buffer.isBuffer(blurredBuffer));
    assert.ok(blurredBuffer.length > 0);

    // Verify metadata of the output
    const metadata = await sharp(blurredBuffer).metadata();
    assert.equal(metadata.format, 'jpeg');
    assert.ok(metadata.width && metadata.width <= 800);
    assert.ok(metadata.height && metadata.height <= 800);
  });

  it('preserves aspect ratio within the 800x800 bounding box', async () => {
    const wideSvg = `
      <svg width="1200" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="600" fill="#3b82f6" />
      </svg>
    `;
    const inputBuffer = await sharp(Buffer.from(wideSvg)).png().toBuffer();
    const blurredBuffer = await generateBlurredImage(inputBuffer);

    const metadata = await sharp(blurredBuffer).metadata();
    assert.equal(metadata.format, 'jpeg');
    assert.equal(metadata.width, 800);
    assert.equal(metadata.height, 400);
  });
});
