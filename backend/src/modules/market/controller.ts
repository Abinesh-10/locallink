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

export async function markAsSold(req: Request, res: Response, next: NextFunction) {
  try {
    const listing = await service.markAsSold(req.user!.id, req.params.id);
    res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

export async function getListing(req: Request, res: Response, next: NextFunction) {
  try {
    const listing = await service.getListingById(req.params.id);
    res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

export async function searchListings(req: Request, res: Response, next: NextFunction) {
  try {
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : undefined;
    const result = await service.searchListings({
      category: req.query.category as string | undefined,
      condition: req.query.condition as string | undefined,
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radiusKm: radius && isValidRadius(radius) ? radius : undefined,
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

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, qty, message } = req.body;
    const order = await service.createOrder(req.user!.id, productId, qty ?? 1, message);

    // Per doc notification trigger: "new request" (an order is market's
    // equivalent of hire's service request / rent's booking).
    try {
      await createNotification({
        userId: order.sellerId,
        type: 'order_new',
        payload: { orderId: order.id, productId, buyerId: req.user!.id },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create new-order notification', { error: notifErr.message });
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function listMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await service.listMyOrders(req.user!.id);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

export async function listSellerOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await service.listOrdersForSeller(req.user!.id);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await service.updateOrderStatus(req.params.id, req.user!.id, req.body.status);

    // Per doc notification trigger: "status change" — notify the buyer.
    try {
      await createNotification({
        userId: order.buyer_id,
        type: 'order_status',
        payload: { orderId: order.id, status: order.status },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create order status-change notification', { error: notifErr.message });
    }

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}
