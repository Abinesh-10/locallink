import { Router } from 'express';
import * as controller from './controller';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { communityPostRateLimiter, sosRateLimiter } from '../../middleware/rateLimit';
import {
  createRequestSchema,
  requestIdParamSchema,
  listRequestsSchema,
  respondSchema,
  sosSchema,
  volunteersQuerySchema,
  createLostFoundSchema,
  updateLostFoundSchema,
  lostFoundIdParamSchema,
  listLostFoundSchema,
} from './schema';

const router = Router();

// GET /community?type=&radius=&urgency= — public browse, no auth required.
router.get('/community', optionalAuth, validate(listRequestsSchema), controller.listRequests);

// GET /community/volunteers?radius= — registered before /community/:id so
// the literal "volunteers" segment is never mistakenly captured as an :id.
router.get('/community/volunteers', validate(volunteersQuerySchema), controller.getVolunteers);

router.get('/community/:id', validate(requestIdParamSchema), controller.getRequest);

// GET /lost-and-found — public browse.
router.get('/lost-and-found', validate(listLostFoundSchema), controller.listLostFound);
router.get('/lost-and-found/:id', validate(lostFoundIdParamSchema), controller.getLostFound);

// Everything below requires authentication.
router.use(requireAuth);

router.post('/community', communityPostRateLimiter, validate(createRequestSchema), controller.createRequest);
router.post('/community/:id/respond', validate(respondSchema), controller.respond);
router.patch('/community/:id/close', validate(requestIdParamSchema), controller.close);

router.post('/community/sos', sosRateLimiter, validate(sosSchema), controller.sos);

router.post('/lost-and-found', validate(createLostFoundSchema), controller.createLostFound);
router.patch('/lost-and-found/:id', validate([...lostFoundIdParamSchema, ...updateLostFoundSchema]), controller.updateLostFound);
router.patch('/lost-and-found/:id/resolve', validate(lostFoundIdParamSchema), controller.markLostFoundResolved);
router.delete('/lost-and-found/:id', validate(lostFoundIdParamSchema), controller.deleteLostFound);

export default router;
