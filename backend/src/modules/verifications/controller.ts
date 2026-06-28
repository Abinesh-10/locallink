import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { ApiError } from '../../middleware/error';
import { verifyKycWebhookSignature } from './provider';

export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, documentNumber } = req.body;
    const result = await service.initiateVerification(req.user!.id, type, documentNumber);
    res.status(201).json({ success: true, verification: result });
  } catch (err) {
    next(err);
  }
}

export async function status(req: Request, res: Response, next: NextFunction) {
  try {
    const verifications = await service.getVerificationStatus(req.user!.id);
    res.json({ success: true, verifications });
  } catch (err) {
    next(err);
  }
}

/**
 * Generic webhook receiver for any KYC provider. Real providers each have
 * their own payload shape; this normalizes to {provider_ref, status} and
 * verifies a shared-secret header (KYC_WEBHOOK_SECRET) before trusting it.
 */
export async function webhook(req: Request, res: Response, next: NextFunction) {
  try {
    const providerName = req.params.provider;
    const signature = req.headers['x-webhook-signature'] as string | undefined;

    if (!verifyKycWebhookSignature(signature)) {
      throw new ApiError(401, 'invalid_webhook_signature', 'Webhook signature verification failed.');
    }

    const { provider_ref, status: newStatus } = req.body;
    if (!provider_ref || !['verified', 'rejected'].includes(newStatus)) {
      throw new ApiError(400, 'invalid_webhook_payload', 'Missing provider_ref or invalid status.');
    }

    await service.handleVerificationWebhook(providerName, provider_ref, newStatus);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
