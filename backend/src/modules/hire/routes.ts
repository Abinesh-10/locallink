import { Router } from 'express';
import * as controller from './controller';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validate } from '../../middleware/validate';
import {
  createWorkerProfileSchema,
  updateWorkerProfileSchema,
  searchWorkersSchema,
  workerIdParamSchema,
  createServiceRequestSchema,
  listMineQuerySchema,
  updateRequestStatusSchema,
  createReviewSchema,
} from './schema';

const router = Router();

// GET /workers?category=&lat=&lng=&radius=&minRating=&verified= — public browse, no auth required.
router.get('/workers', optionalAuth, validate(searchWorkersSchema), controller.searchWorkers);

// GET /workers/:id — requires auth: this returns the worker's phone number
// for the call/WhatsApp deep links, so an accountable identity must be
// behind every view (rate-limitable, bannable) rather than fully anonymous.
router.get('/workers/:id', requireAuth, validate(workerIdParamSchema), controller.getWorkerById);

// Everything below requires authentication.
router.use(requireAuth);

// POST /worker-profile, PATCH /worker-profile — create/update own profile.
router.post('/worker-profile', validate(createWorkerProfileSchema), controller.createWorkerProfile);
router.patch('/worker-profile', validate(updateWorkerProfileSchema), controller.patchWorkerProfile);
router.get('/worker-profile/me', controller.getMyWorkerProfile);

// POST /service-requests — any authenticated customer can request service.
router.post('/service-requests', validate(createServiceRequestSchema), controller.createServiceRequest);

// GET /service-requests/mine — per doc, this is the customer's sent-requests view.
router.get('/service-requests/mine', validate(listMineQuerySchema), controller.listSentRequests);

// Worker's inbox of requests received — not explicitly named in doc §4's
// endpoint list, but required by the /requests/inbox frontend page and the
// doc's own Phase 2 feature description ("'Request service'... ratings +
// reviews"). Modeled as a sibling of /service-requests/mine.
router.get('/service-requests/inbox', requireRole('worker'), validate(listMineQuerySchema), controller.listInboxRequests);

// PATCH /service-requests/:id/status
router.patch('/service-requests/:id/status', validate(updateRequestStatusSchema), controller.updateRequestStatus);

// POST /reviews
router.post('/reviews', validate(createReviewSchema), controller.createReview);

export default router;
