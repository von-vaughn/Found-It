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
  MAIL_FROM: process.env.MAIL_FROM || 'FoundIt <no-reply@foundit.local>',
  OTP_EXPIRES_MINUTES: Number(process.env.OTP_EXPIRES_MINUTES || 10),
};

// Fail fast in production with default secrets
if (env.NODE_ENV === 'production') {
  required('DATABASE_URL');
  if (
    env.JWT_ACCESS_SECRET === 'dev-access-secret-change-me' ||
    env.JWT_REFRESH_SECRET === 'dev-refresh-secret-change-me'
  ) {
    throw new Error('Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in production.');
  }
}
