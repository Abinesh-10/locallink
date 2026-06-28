import { env } from '../../config/env';
import { logger } from '../../lib/logger';

export type KycType = 'aadhaar' | 'driving_license' | 'gst';

export interface KycInitiateResult {
  providerRef: string;
  /** Some providers return an immediate result (e.g. GST lookup is synchronous);
   *  others are async and only resolve via webhook. */
  immediateStatus?: 'verified' | 'rejected';
}

/**
 * Abstracts away Surepass/HyperVerge specifics, per doc's vendor-lock-in
 * risk mitigation ("Storage, mailer, OTP, geo behind service interfaces").
 * Neither provider's real API can be exercised in this environment (paid
 * contracts, signed webhooks), so this throws a clear "not configured"
 * error when KYC_API_KEY is unset — callers fall back to the doc's
 * explicit MVP scope: "manual admin review acceptable at launch".
 */
export function isKycProviderConfigured(): boolean {
  return Boolean(env.KYC_API_KEY && env.KYC_API_BASE_URL);
}

export async function initiateKycCheck(
  type: KycType,
  userId: string,
  documentPayload: Record<string, unknown>
): Promise<KycInitiateResult> {
  if (!isKycProviderConfigured()) {
    // Dev/MVP fallback: generate a local reference and leave status as
    // 'pending' for manual admin review, matching the doc's risk mitigation
    // for "KYC provider downtime" verbatim.
    const fallbackRef = `manual-${userId}-${type}-${Date.now()}`;
    logger.warn('KYC provider not configured — falling back to manual review', { userId, type, fallbackRef });
    return { providerRef: fallbackRef };
  }

  try {
    const res = await fetch(`${env.KYC_API_BASE_URL}/v1/${type}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.KYC_API_KEY}`,
      },
      body: JSON.stringify({ ...documentPayload, client_ref: userId }),
    });
    const data: any = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || `${env.KYC_PROVIDER} returned ${res.status}`);
    }
    return {
      providerRef: data.request_id || data.client_id || `${env.KYC_PROVIDER}-${Date.now()}`,
      immediateStatus: data.status === 'verified' ? 'verified' : data.status === 'rejected' ? 'rejected' : undefined,
    };
  } catch (err: any) {
    logger.error('KYC provider call failed', { type, userId, error: err.message });
    // Per doc risk mitigation: provider downtime falls back to manual review
    // rather than blocking the user entirely.
    const fallbackRef = `manual-fallback-${userId}-${type}-${Date.now()}`;
    return { providerRef: fallbackRef };
  }
}

/**
 * Verifies that an incoming KYC webhook actually came from the configured
 * provider, using a dedicated shared secret (separate from MSG91's, since
 * conflating the two would be misleading even though the comparison
 * mechanics are identical).
 */
export function verifyKycWebhookSignature(receivedSecret: string | undefined): boolean {
  if (!env.KYC_WEBHOOK_SECRET) {
    logger.warn('KYC_WEBHOOK_SECRET not set — rejecting webhook by default');
    return false;
  }
  return receivedSecret === env.KYC_WEBHOOK_SECRET;
}
