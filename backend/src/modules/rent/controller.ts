import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { isValidRadius } from '../../lib/geo';
import { createNotification } from '../notifications/service';
import { logger } from '../../lib/logger';

export async function createListing(req: Request, res: Response, next: NextFunction) {
  try {
    const listing = await service.createListing(req.user!.id, req.body);
    res.status(201).json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

export async function updateListing(req: Request, res: Response, next: NextFunction) {
  try {
    const listing = await service.updateListing(req.user!.id, req.params.id, req.body);
    res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

export async function deleteListing(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteListing(req.user!.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getListing(req: Request, res: Response, next: NextFunction) {
  try {
    const listing = await service.getListingById(req.params.id);
    const reviews = await service.listListingReviews(req.params.id);
    res.json({ success: true, listing, reviews });
  } catch (err) {
    next(err);
  }
}

export async function searchListings(req: Request, res: Response, next: NextFunction) {
  try {
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : undefined;
    const result = await service.searchListings({
      category: req.query.category as string | undefined,
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radiusKm: radius && isValidRadius(radius) ? radius : undefined,
      verifiedOnly: req.query.verified === 'true',
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });
    res.json({ success: true, listings: result });
  } catch (err) {
    next(err);
  }
}

export async function listMyListings(req: Request, res: Response, next: NextFunction) {
  try {
    const listings = await service.listMyListings(req.user!.id);
    res.json({ success: true, listings });
  } catch (err) {
    next(err);
  }
}

export async function getAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const availability = await service.getAvailability(req.params.id);
    res.json({ success: true, availability });
  } catch (err) {
    next(err);
  }
}

export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const { listingId, startDate, endDate, totalAmount } = req.body;
    const booking = await service.createBooking(req.user!.id, listingId, startDate, endDate, totalAmount);

    // Per doc notification trigger: "new request" (a booking is rent's
    // equivalent of hire's service request).
    try {
      await createNotification({
        userId: booking.ownerId,
        type: 'booking_new',
        payload: { bookingId: booking.id, listingId, renterId: req.user!.id },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create new-booking notification', { error: notifErr.message });
    }

    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function listMyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const bookings = await service.listMyBookingsAsRenter(req.user!.id);
    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
}

export async function listOwnerBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const bookings = await service.listBookingsForOwner(req.user!.id);
    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
}

export async function updateBookingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await service.updateBookingStatus(req.params.id, req.user!.id, req.body.status);

    // Per doc notification trigger: "status change" — notify the renter
    // (the owner is the one acting in most transitions, so they don't
    // need to notify themselves; the one exception, renter-initiated
    // cancellation, is rare enough that over-notifying the renter in that
    // case is an acceptable tradeoff vs. adding more branching here).
    try {
      await createNotification({
        userId: booking.renter_id,
        type: 'booking_status',
        payload: { bookingId: booking.id, status: booking.status },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create booking status-change notification', { error: notifErr.message });
    }

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { listingId, bookingId, rating, comment } = req.body;
    const review = await service.createRentalReview(req.user!.id, listingId, bookingId, rating, comment);

    // Per doc notification trigger: "new review". Reviews are scoped to
    // the listing, not the owner directly (see Phase 3 notes), so we
    // fetch the listing to find who to notify.
    try {
      const listing = await service.getListingById(listingId);
      await createNotification({
        userId: listing.owner_id,
        type: 'review_new',
        payload: { reviewId: review.id, listingId, rating, reviewerId: req.user!.id },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create new-review notification', { error: notifErr.message });
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    next(err);
  }
}
