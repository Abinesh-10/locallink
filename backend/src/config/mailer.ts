import nodemailer, { Transporter } from 'nodemailer';
import { env } from './env';
import { logger } from '../lib/logger';

let transporter: Transporter | null = null;

export function isMailerConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!isMailerConfigured()) {
    // Dev fallback: log instead of failing the request, so signup flows
    // remain testable locally before SMTP credentials are wired up.
    logger.warn('SMTP not configured — logging email instead of sending', { to, subject, html });
    return;
  }
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  });
}
