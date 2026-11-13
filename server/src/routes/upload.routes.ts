import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate';
import {
  isDriveConfigured,
  uploadFileToDrive,
  type DriveUploadedFile,
} from '../utils/google-drive';
import { generateBlurredImage } from '../utils/image-blur';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // max 5 files per upload
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WEBP, GIF, HEIC, and AVIF images are allowed.`));
    }
  },
});

// All upload routes require authentication
router.use(authenticate);

/**
 * POST /api/upload
 * Handles multipart form-data (single or multiple images).
 * Uploads images to Google Drive and returns public CDN direct URLs.
 */
router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.any()(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Image exceeds maximum allowed size of 10MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ message: 'Cannot upload more than 5 images at a time.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    if (!isDriveConfigured()) {
      res.status(503).json({
        message: 'Google Drive storage is not configured on the server.',
      });
      return;
    }

    try {
      const shouldBlur =
        req.query.isFound === 'true' ||
        req.body?.isFound === 'true' ||
        req.query.blur === 'true' ||
        req.body?.blur === 'true' ||
        req.body?.reportType === 'found' ||
        req.query.type === 'found';

      const uploadedResults: DriveUploadedFile[] = [];
      const blurredResults: (DriveUploadedFile | null)[] = [];

      // 1. Process files from multipart/form-data
      const rawFiles = req.files as Express.Multer.File[] | undefined;
      if (rawFiles && rawFiles.length > 0) {
        for (const file of rawFiles) {
          if (shouldBlur) {
            const blurredBuffer = await generateBlurredImage(file.buffer);
            const [originalUploaded, blurredUploaded] = await Promise.all([
              uploadFileToDrive({
                name: `${Date.now()}-${file.originalname || 'image.jpg'}`,
                mimeType: file.mimetype,
                content: file.buffer,
              }),
              uploadFileToDrive({
                name: `blurred-${Date.now()}-${file.originalname || 'image.jpg'}`,
                mimeType: 'image/jpeg',
                content: blurredBuffer,
              }),
            ]);
            uploadedResults.push(originalUploaded);
            blurredResults.push(blurredUploaded);
          } else {
            const uploaded = await uploadFileToDrive({
              name: `${Date.now()}-${file.originalname || 'image.jpg'}`,
              mimeType: file.mimetype,
              content: file.buffer,
            });
            uploadedResults.push(uploaded);
            blurredResults.push(null);
          }
        }
      }

      if (uploadedResults.length === 0) {
        res.status(400).json({
          message: 'No valid image provided. Attach image file(s) via multipart form-data.',
        });
        return;
      }

      const validBlurredUrls = blurredResults.map((b) => b?.directUrl).filter(Boolean) as string[];

      res.status(201).json({
        message: 'Image(s) uploaded successfully.',
        url: uploadedResults[0].directUrl,
        urls: uploadedResults.map((f) => f.directUrl),
        blurredUrl: validBlurredUrls[0] || undefined,
        blurredUrls: validBlurredUrls.length > 0 ? validBlurredUrls : undefined,
        files: uploadedResults.map((f, i) => ({
          id: f.id,
          name: f.name,
          url: f.directUrl,
          blurredUrl: blurredResults[i]?.directUrl,
          thumbnailUrl: f.thumbnailUrl,
          webViewLink: f.webViewLink,
        })),
      });
    } catch (err: unknown) {
      console.error('[Upload] Failed to upload image to Google Drive:', err);
      res.status(500).json({
        message: 'Failed to upload image to Google Drive.',
      });
    }
  },
);

export default router;
