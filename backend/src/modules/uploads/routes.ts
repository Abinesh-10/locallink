import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { generateUploadSignature } from '../../config/cloudinary';
import { ApiError } from '../../middleware/error';
import { signatureRequestSchema, PURPOSE_FOLDERS } from './schema';

const router = Router();

router.use(requireAuth);

/**
 * POST /uploads/cloudinary-signature — generic signed-upload endpoint per
 * doc §4. The folder is resolved server-side from a whitelisted `purpose`,
 * never taken directly from the client — letting the client supply an
 * arbitrary folder string would let it write signed uploads anywhere in
 * the Cloudinary account.
 */
router.post('/uploads/cloudinary-signature', validate(signatureRequestSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderTemplate = PURPOSE_FOLDERS[req.body.purpose];
    const folder = `locallink/${folderTemplate.replace('{userId}', req.user!.id)}`;
    const signature = generateUploadSignature(folder);
    res.json({ success: true, ...signature });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cloudinary is not configured')) {
      return next(new ApiError(503, 'service_unavailable', err.message));
    }
    next(err);
  }
});

export default router;
