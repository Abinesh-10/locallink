import { body } from 'express-validator';

// Whitelisted purposes map to specific folder paths server-side — the
// client never supplies a raw folder string, which would let it write
// signed uploads into arbitrary Cloudinary paths.
export const PURPOSE_FOLDERS: Record<string, string> = {
  profile_photo: 'users/{userId}/profile',
  chat_image: 'chat/{userId}',
  worker_portfolio: 'hire/{userId}/portfolio',
  rental_listing: 'rent/{userId}/listings',
  product_listing: 'market/{userId}/listings',
  lost_found: 'community/{userId}/lost-found',
};

export const signatureRequestSchema = [
  body('purpose')
    .isIn(Object.keys(PURPOSE_FOLDERS))
    .withMessage(`purpose must be one of: ${Object.keys(PURPOSE_FOLDERS).join(', ')}`),
];
