import { Router } from 'express';
import * as controller from './controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createListingSchema,
  updateListingSchema,
  listingIdParamSchema,
  searchListingsSchema,
  availabilityQuerySchema,
  createBookingSchema,
  updateBookingStatusSchema,
  createRentalReviewSchema,
} from './schema';

const router = Router();

// GET /rentals?... — public browse, no auth required.
router.get('/rentals', validate(searchListingsSchema), controller.searchListings);

// GET /rentals/:id/availability — registered before GET /rentals/:id as the
// safer convention for sub-resource routes alongside a bare :id route.
router.get('/rentals/:id/availability', validate(availabilityQuerySchema), controller.getAvailability);

// GET /rentals/:id — public listing detail page. (No phone number is
// exposed here, unlike Phase 2's worker detail — so unlike that endpoint,
// this one doesn't need requireAuth.)
router.get('/rentals/:id', validate(listingIdParamSchema), controller.getListing);

// Everything below requires authentication.
router.use(requireAuth);

// POST /rentals, PATCH /rentals/:id, DELETE /rentals/:id
router.post('/rentals', validate(createListingSchema), controller.createListing);
router.patch('/rentals/:id', validate([...listingIdParamSchema, ...updateListingSchema]), controller.updateListing);
router.delete('/rentals/:id', validate(listingIdParamSchema), controller.deleteListing);

// Owner's own listings — not explicitly named in doc §4's endpoint list,
// but required by the /list-an-item management flow, mirroring hire
// module's worker-profile/me precedent.
router.get('/rentals-mine', controller.listMyListings);

// POST /rental-bookings, PATCH /rental-bookings/:id/status
router.post('/rental-bookings', validate(createBookingSchema), controller.createBooking);
router.get('/rental-bookings/mine', controller.listMyBookings);
router.get('/rental-bookings/owner', controller.listOwnerBookings);
router.patch('/rental-bookings/:id/status', validate(updateBookingStatusSchema), controller.updateBookingStatus);

// Reviews reuse the same general pattern as Phase 2's /reviews, but rental
// reviews need a distinct endpoint since the request shape differs
// (listingId+bookingId vs workerId+requestId) and the completion check is
// against rental_bookings.status='returned', not service_requests.status='completed'.
router.post('/rental-reviews', validate(createRentalReviewSchema), controller.createReview);

export default router;
