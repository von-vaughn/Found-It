import { google, type drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { env } from '../config/env';

/**
 * Checks whether Google Drive credentials are configured.
 */
export function isDriveConfigured(): boolean {
  return Boolean(
    env.GOOGLE_DRIVE_CLIENT_ID &&
    env.GOOGLE_DRIVE_CLIENT_SECRET &&
    env.GOOGLE_DRIVE_REFRESH_TOKEN,
  );
}

let driveClient: drive_v3.Drive | null = null;

/**
 * Returns a cached, authenticated Google Drive v3 client instance.
 * Uses its own separate OAuth2 credentials from the Gmail API.
 */
export function getDriveClient(): drive_v3.Drive {
  if (!driveClient) {
    if (!isDriveConfigured()) {
      throw new Error(
        'Google Drive API is not configured. Missing GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, or GOOGLE_DRIVE_REFRESH_TOKEN.',
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_DRIVE_CLIENT_ID,
      env.GOOGLE_DRIVE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({
      refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
    });

    driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  }

  return driveClient;
}

export interface UploadFileOptions {
  /** The file name to display in Google Drive */
  name: string;
  /** MIME type of the file (e.g. image/jpeg, image/png) */
  mimeType: string;
  /** File content as a Buffer or a readable stream */
  content: Buffer | Readable;
  /** Optional Google Drive folder ID to upload into */
  folderId?: string;
  /** If true, grants 'anyone' reader permission for direct public access (default: true) */
  makePublic?: boolean;
}

export interface DriveUploadedFile {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  webContentLink?: string;
  /** Direct image display URL suitable for HTML <img src="..."> tags */
  directUrl: string;
  thumbnailUrl?: string;
}

/**
 * Uploads a file to Google Drive and optionally makes it publicly readable.
 */
export async function uploadFileToDrive(options: UploadFileOptions): Promise<DriveUploadedFile> {
  const drive = getDriveClient();
  const folder = options.folderId || env.GOOGLE_DRIVE_FOLDER_ID;

  const fileMetadata: drive_v3.Schema$File = {
    name: options.name,
    parents: folder ? [folder] : undefined,
  };

  const mediaStream = Buffer.isBuffer(options.content)
    ? Readable.from(options.content)
    : options.content;

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: options.mimeType,
      body: mediaStream,
    },
    fields: 'id, name, mimeType, webViewLink, webContentLink',
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error('Google Drive API did not return a file ID after upload.');
  }

  if (options.makePublic !== false) {
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (err) {
      console.warn(`[Google Drive] Could not set public permission on file ${fileId}:`, err);
    }
  }

  // Google Drive provides high-performance web content via lh3.googleusercontent.com for public files
  const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
  const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;

  return {
    id: fileId,
    name: response.data.name ?? options.name,
    mimeType: response.data.mimeType ?? options.mimeType,
    webViewLink: response.data.webViewLink ?? undefined,
    webContentLink: response.data.webContentLink ?? undefined,
    directUrl,
    thumbnailUrl,
  };
}

/**
 * Deletes a file from Google Drive by its file ID.
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Retrieves file metadata from Google Drive.
 */
export async function getDriveFileMetadata(fileId: string): Promise<drive_v3.Schema$File> {
  const drive = getDriveClient();
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime, thumbnailLink',
  });
  return response.data;
}

/**
 * Diagnostic helper to test the Google Drive connection on server startup or health checks.
 */
export async function testDriveConnection(): Promise<boolean> {
  if (!isDriveConfigured()) return false;
  try {
    const drive = getDriveClient();
    await drive.files.list({ pageSize: 1 });
    return true;
  } catch (err) {
    const errorDetails =
      err && typeof err === 'object'
        ? (err as { code?: unknown; status?: unknown })
        : {};
    console.error('[Google Drive] Connection test failed.', {
      code:
        typeof errorDetails.code === 'string' ? errorDetails.code : undefined,
      status:
        typeof errorDetails.status === 'number'
          ? errorDetails.status
          : undefined,
    });
    return false;
  }
}
