import { env } from '../config/env';

function isMailConfigured(): boolean {
  return Boolean(
    env.GMAIL_USER && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN,
  );
}

/**
 * Sends the 6-digit verification OTP.
 * Dev fallback: if Gmail OAuth2 isn't configured, prints the OTP to the
 * server console so the flow can be tested without Google credentials.
 * In production, an unconfigured mailer is a fatal misconfiguration: silently
 * logging OTPs would leak live credentials into the logs and no user would
 * ever receive a code.
 */
export function assertMailConfigured(): void {
  if (env.NODE_ENV === 'production' && !isMailConfigured()) {
    throw new Error(
      'Gmail OAuth2 is not configured (GMAIL_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN are required in production). Refusing to start with a console-only mailer.',
    );
  }
}

// Uses the Gmail REST API (scope: gmail.send) instead of nodemailer SMTP,
// because the stored refresh token lacks the full https://mail.google.com/
// scope that SMTP XOAUTH2 requires. shortcut: tokens must be re-issued with
// that scope if SMTP is ever needed.

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
  if (!isMailConfigured()) {
    console.log(`[dev-mail] OTP for ${to}: ${otp} (expires in ${env.OTP_EXPIRES_MINUTES} min)`);
    return;
  }

  const boundary = `foundit-${Date.now()}`;
  const html =
    `<p>Hi ${name},</p><p>Your FoundIt verification code is: ` +
    `<strong style="font-size:20px;letter-spacing:4px">${otp}</strong></p>` +
    `<p>It expires in ${env.OTP_EXPIRES_MINUTES} minutes. If you didn't request this, ignore this email.</p>`;
  const rfc822 = [
    `From: ${env.MAIL_FROM}`,
    `To: ${to}`,
    `Subject: Your FoundIt verification code`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    `Hi ${name},\n\nYour FoundIt verification code is: ${otp}\n\nIt expires in ${env.OTP_EXPIRES_MINUTES} minutes. If you didn't request this, ignore this email.`,
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: Buffer.from(rfc822).toString('base64url') }),
  });
  if (!res.ok) {
    throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`);
  }
}
