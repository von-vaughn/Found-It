import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

function isMailConfigured(): boolean {
  return Boolean(
    env.GMAIL_USER && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN,
  );
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: env.GMAIL_USER,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        refreshToken: env.GOOGLE_REFRESH_TOKEN,
      },
    });
  }
  return transporter;
}

/**
 * Sends the 6-digit verification OTP.
 * Dev fallback: if Gmail OAuth2 isn't configured, prints the OTP to the
 * server console so the flow can be tested without Google credentials.
 */
export async function sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
  if (!isMailConfigured()) {
    console.log(`[dev-mail] OTP for ${to}: ${otp} (expires in ${env.OTP_EXPIRES_MINUTES} min)`);
    return;
  }
  await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to,
    subject: 'Your FoundIt verification code',
    text: `Hi ${name},\n\nYour FoundIt verification code is: ${otp}\n\nIt expires in ${env.OTP_EXPIRES_MINUTES} minutes. If you didn't request this, ignore this email.`,
    html: `<p>Hi ${name},</p><p>Your FoundIt verification code is: <strong style="font-size:20px;letter-spacing:4px">${otp}</strong></p><p>It expires in ${env.OTP_EXPIRES_MINUTES} minutes. If you didn't request this, ignore this email.</p>`,
  });
}
