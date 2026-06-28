import { env } from './env';
import { logger } from '../lib/logger';

export function isMsg91Configured(): boolean {
  return Boolean(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID);
}

interface SendOtpResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

/**
 * Sends an OTP SMS via MSG91. Abstracted behind this module (per doc's
 * "abstracted behind OTPService" risk mitigation) so the provider can be
 * swapped without touching call sites in the auth module.
 */
export async function sendOtpSms(phoneE164: string, otp: string): Promise<SendOtpResult> {
  if (!isMsg91Configured()) {
    logger.warn('MSG91 not configured — logging OTP instead of sending', { phoneE164, otp });
    return { success: true, requestId: 'dev-mode-no-send' };
  }

  // MSG91 expects numbers without the leading '+'
  const mobile = phoneE164.replace(/^\+/, '');

  try {
    const res = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: env.MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        template_id: env.MSG91_TEMPLATE_ID,
        mobile,
        otp,
        sender: env.MSG91_SENDER_ID,
      }),
    });
    const data: any = await res.json();
    if (!res.ok) {
      logger.error('MSG91 send failed', { status: res.status, data });
      return { success: false, error: data?.message || 'MSG91 request failed' };
    }
    return { success: true, requestId: data?.request_id };
  } catch (err: any) {
    logger.error('MSG91 network error', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Sends a plain SMS (used for SOS emergency contact alerts in Phase 5).
 * Defined now since the doc lists it under MSG91 responsibilities, but
 * unused until the community module exists.
 */
export async function sendSms(phoneE164: string, message: string): Promise<SendOtpResult> {
  if (!isMsg91Configured()) {
    logger.warn('MSG91 not configured — logging SMS instead of sending', { phoneE164, message });
    return { success: true, requestId: 'dev-mode-no-send' };
  }
  const mobile = phoneE164.replace(/^\+/, '');
  try {
    const res = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: env.MSG91_AUTH_KEY },
      body: JSON.stringify({ mobiles: mobile, message, sender: env.MSG91_SENDER_ID }),
    });
    const data: any = await res.json();
    if (!res.ok) return { success: false, error: data?.message || 'MSG91 SMS failed' };
    return { success: true, requestId: data?.request_id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Verifies that an incoming MSG91 webhook actually came from MSG91, using
 * the shared secret configured in the dashboard. Per doc security
 * requirement: "MSG91 webhook signature verification".
 */
export function verifyMsg91WebhookSignature(receivedSecret: string | undefined): boolean {
  if (!env.MSG91_WEBHOOK_SECRET) {
    logger.warn('MSG91_WEBHOOK_SECRET not set — rejecting webhook by default');
    return false;
  }
  return receivedSecret === env.MSG91_WEBHOOK_SECRET;
}
