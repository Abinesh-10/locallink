import { body, query } from 'express-validator';

export const initiateVerificationSchema = [
  body('type').isIn(['aadhaar', 'driving_license', 'gst']).withMessage('type must be aadhaar, driving_license, or gst'),
  // Document fields vary by type; we accept a free-form object and pass it
  // straight to the provider. We deliberately do NOT validate/store the raw
  // document number long-term — only the provider reference, per doc
  // security requirement: "KYC documents never stored raw".
  body('documentNumber').isString().isLength({ min: 4, max: 64 }).withMessage('documentNumber is required'),
];

export const verificationStatusQuerySchema = [
  query('type').optional().isIn(['aadhaar', 'driving_license', 'gst']),
];
