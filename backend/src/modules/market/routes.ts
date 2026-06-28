import { Router } from 'express';
import * as controller from './controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createListingSchema,
  updateListingSchema,
  listingIdParamSchema,
  searchListingsSchema,
  createOrderSchema,
  updateOrderStatusSchema,
} from './schema';

const router = Router();

// GET /products?... — public browse, no auth required.
router.get('/products', validate(searchListingsSchema), controller.searchListings);

// GET /products/:id — public listing detail page.
router.get('/products/:id', validate(listingIdParamSchema), controller.getListing);

// Everything below requires authentication.
router.use(requireAuth);

// POST /products, PATCH /products/:id, DELETE /products/:id (soft delete)
router.post('/products', validate(createListingSchema), controller.createListing);
router.patch('/products/:id', validate([...listingIdParamSchema, ...updateListingSchema]), controller.updateListing);
router.delete('/products/:id', validate(listingIdParamSchema), controller.deleteListing);

// "mark sold" per doc Phase 4 feature list — a distinct seller action from
// a generic PATCH, since it's a one-way status transition rather than a
// general field update.
router.patch('/products/:id/mark-sold', validate(listingIdParamSchema), controller.markAsSold);

// Seller's own listings — same precedent as hire/rent modules' /mine routes.
router.get('/products-mine', controller.listMyListings);

// POST /orders, PATCH /orders/:id/status
router.post('/orders', validate(createOrderSchema), controller.createOrder);
router.get('/orders/mine', controller.listMyOrders);
router.get('/orders/seller', controller.listSellerOrders);
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), controller.updateOrderStatus);

export default router;
