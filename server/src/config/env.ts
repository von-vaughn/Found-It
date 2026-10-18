import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://foundit:foundit123@localhost:5432/foundit',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  SUPER_ADMIN_EMAIL: (process.env.SUPER_ADMIN_EMAIL || 'superadmin@foundit.local').toLowerCase(),
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!',
  SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  SEED_DEMO_USERS: (process.env.SEED_DEMO_USERS || 'true').toLowerCase() === 'true',
  /** Comma-separated CORS allowlist. Empty = allow all (dev default). Set in production. */
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Gmail OAuth2 (Google Cloud project with Gmail API enabled).
  // Empty = mailer runs in dev fallback mode (OTP printed to console, nothing sent).
  GMAIL_USER: process.env.GMAIL_USER || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN || '',
  // Google Drive OAuth2 (Separate Google Cloud project / account)
  GOOGLE_DRIVE_CLIENT_ID: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
  GOOGLE_DRIVE_CLIENT_SECRET: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
  GOOGLE_DRIVE_REFRESH_TOKEN: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '',
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  MAIL_FROM: process.env.MAIL_FROM || 'FoundIt <no-reply@foundit.local>',
  OTP_EXPIRES_MINUTES: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  OTP_SECRET: process.env.OTP_SECRET || 'dev-otp-secret-change-me-at-least-32-bytes',
  COOKIE_SECURE:
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.COOKIE_SECURE !== 'false' && (process.env.NODE_ENV || 'development') === 'production'),
};

// Fail fast in production with default secrets or weak keys
if (env.NODE_ENV === 'production') {
  required('DATABASE_URL');
  if (
    env.JWT_ACCESS_SECRET === 'dev-access-secret-change-me' ||
    env.JWT_REFRESH_SECRET === 'dev-refresh-secret-change-me' ||
    env.OTP_SECRET === 'dev-otp-secret-change-me-at-least-32-bytes'
  ) {
    throw new Error('Default dev secrets cannot be used in production.');
  }
  if (Buffer.byteLength(env.JWT_ACCESS_SECRET) < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 bytes.');
  }
  if (Buffer.byteLength(env.JWT_REFRESH_SECRET) < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 bytes.');
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct.');
  }
  if (Buffer.byteLength(env.OTP_SECRET) < 32) {
    throw new Error('OTP_SECRET must be at least 32 bytes.');
  }
}
