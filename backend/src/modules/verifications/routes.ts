import { Router } from 'express';
import * as controller from './controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { initiateVerificationSchema } from './schema';

const router = Router();

// Webhook is unauthenticated by access-token (the provider can't have one)
// but is signature-verified inside the controller — must be registered
// before requireAuth is applied to the rest of this router.
router.post('/webhook/:provider', controller.webhook);

router.use(requireAuth);
router.post('/initiate', validate(initiateVerificationSchema), controller.initiate);
router.get('/status', controller.status);

export default router;
