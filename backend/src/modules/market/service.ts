import { query, withTransaction } from '../../config/db';
import { ApiError } from '../../middleware/error';

// ── Listings ──────────────────────────────────────────────────────────

export interface CreateListingInput {
  categoryId?: string;
  title: string;
  description?: string;
  price: number;
  condition: 'new' | 'like_new' | 'used' | 'refurbished';
  qty?: number;
  photos?: string[];
  deliveryOption?: 'pickup' | 'local_delivery' | 'both';
  lat?: number;
  lng?: number;
}

export async function createListing(sellerId: string, input: CreateListingInput) {
  if (input.categoryId) {
    const categoryRes = await query('SELECT id FROM product_categories WHERE id = $1', [input.categoryId]);
    if (categoryRes.rows.length === 0) {
      throw new ApiError(400, 'invalid_category', 'Unknown product category.');
    }
  }

  const result = await query(
    `INSERT INTO product_listings (seller_id, category_id, title, description, price, condition, qty, photos, delivery_option, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 1), $8, COALESCE($9, 'pickup'), $10, $11)
     RETURNING *`,
    [
      sellerId,
      input.categoryId ?? null,
      input.title,
      input.description ?? null,
      input.price,
      input.condition,
      input.qty,
      input.photos ?? [],
      input.deliveryOption,
      input.lat ?? null,
      input.lng ?? null,
    ]
  );

  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE name = 'seller'
     ON CONFLICT DO NOTHING`,
    [sellerId]
  );

  return result.rows[0];
}

export async function updateListing(sellerId: string, listingId: string, input: Partial<CreateListingInput>) {
  const existing = await query('SELECT * FROM product_listings WHERE id = $1 AND deleted_at IS NULL', [listingId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  if (existing.rows[0].seller_id !== sellerId) {
    throw new ApiError(403, 'forbidden', 'Only the seller can update this listing.');
  }

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  const fieldMap: Record<string, any> = {
    category_id: input.categoryId,
    title: input.title,
    description: input.description,
    price: input.price,
    condition: input.condition,
    qty: input.qty,
    photos: input.photos,
    delivery_option: input.deliveryOption,
    lat: input.lat,
    lng: input.lng,
  };
  for (const [col, val] of Object.entries(fieldMap)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (sets.length === 0) return existing.rows[0];

  values.push(listingId);
  const result = await query(
    `UPDATE product_listings SET ${sets.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteListing(sellerId: string, listingId: string) {
  const existing = await query('SELECT seller_id FROM product_listings WHERE id = $1 AND deleted_at IS NULL', [listingId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  if (existing.rows[0].seller_id !== sellerId) {
    throw new ApiError(403, 'forbidden', 'Only the seller can delete this listing.');
  }
  await query('UPDATE product_listings SET deleted_at = now() WHERE id = $1', [listingId]);
}

export async function markAsSold(sellerId: string, listingId: string) {
  const existing = await query('SELECT seller_id FROM product_listings WHERE id = $1 AND deleted_at IS NULL', [listingId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  if (existing.rows[0].seller_id !== sellerId) {
    throw new ApiError(403, 'forbidden', 'Only the seller can mark this listing sold.');
  }
  const result = await query(
    `UPDATE product_listings SET status = 'sold' WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [listingId]
  );
  return result.rows[0];
}

export async function getListingById(listingId: string) {
  const res = await query(
    `SELECT pl.*, u.full_name AS seller_name, u.photo_url AS seller_photo_url,
            pc.slug AS category_slug, pc.names AS category_names,
            EXISTS (
              SELECT 1 FROM identity_verifications iv
              WHERE iv.user_id = pl.seller_id AND iv.type IN ('aadhaar', 'driving_license') AND iv.status = 'verified'
            ) AS is_verified_seller
     FROM product_listings pl
     JOIN users u ON u.id = pl.seller_id
     LEFT JOIN product_categories pc ON pc.id = pl.category_id
     WHERE pl.id = $1 AND pl.deleted_at IS NULL`,
    [listingId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  return res.rows[0];
}

export interface SearchListingsParams {
  category?: string;
  condition?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page: number;
  limit: number;
}

export async function searchListings(params: SearchListingsParams) {
  const { category, condition, lat, lng, radiusKm, page, limit } = params;
  const hasGeo = lat !== undefined && lng !== undefined;

  const conditions: string[] = ['pl.deleted_at IS NULL', "pl.status = 'available'"];
  const values: any[] = [];
  let i = 1;

  if (category) {
    conditions.push(`pl.category_id = $${i++}`);
    values.push(category);
  }
  if (condition) {
    conditions.push(`pl.condition = $${i++}`);
    values.push(condition);
  }

  let latParam = '';
  let lngParam = '';
  if (hasGeo) {
    values.push(lat, lng);
    latParam = `$${i++}`;
    lngParam = `$${i++}`;
  }
  if (hasGeo && radiusKm) {
    conditions.push(
      `earth_box(ll_to_earth(${latParam}, ${lngParam}), $${i} * 1000) @> ll_to_earth(pl.lat, pl.lng)
       AND earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(pl.lat, pl.lng)) <= $${i} * 1000`
    );
    values.push(radiusKm);
    i += 1;
  }

  const distanceSelect = hasGeo
    ? `earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(pl.lat, pl.lng)) / 1000.0 AS distance_km`
    : `NULL AS distance_km`;

  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const sql = `
    SELECT pl.id, pl.seller_id, pl.category_id, pl.title, pl.price, pl.condition, pl.qty,
           pl.photos, pl.delivery_option, pl.status,
           u.full_name AS seller_name, u.photo_url AS seller_photo_url,
           pc.slug AS category_slug, pc.names AS category_names,
           EXISTS (
             SELECT 1 FROM identity_verifications iv
             WHERE iv.user_id = pl.seller_id AND iv.type IN ('aadhaar', 'driving_license') AND iv.status = 'verified'
           ) AS is_verified_seller,
           ${distanceSelect}
    FROM product_listings pl
    JOIN users u ON u.id = pl.seller_id
    LEFT JOIN product_categories pc ON pc.id = pl.category_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${hasGeo ? 'distance_km ASC' : 'pl.created_at DESC'}
    LIMIT $${i++} OFFSET $${i++}
  `;

  const result = await query(sql, values);
  return result.rows;
}

export async function listMyListings(sellerId: string) {
  const res = await query(
    'SELECT * FROM product_listings WHERE seller_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
    [sellerId]
  );
  return res.rows;
}

// ── Orders ────────────────────────────────────────────────────────────

export async function createOrder(buyerId: string, productId: string, qty: number, message?: string) {
  const productRes = await query(
    'SELECT seller_id, qty, status FROM product_listings WHERE id = $1 AND deleted_at IS NULL',
    [productId]
  );
  if (productRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  const product = productRes.rows[0];

  if (product.seller_id === buyerId) {
    throw new ApiError(400, 'invalid_request', 'You cannot order your own listing.');
  }
  if (product.status !== 'available') {
    throw new ApiError(400, 'listing_unavailable', 'This listing is no longer available.');
  }
  if (qty > product.qty) {
    throw new ApiError(400, 'insufficient_qty', `Only ${product.qty} available.`);
  }

  const result = await query(
    `INSERT INTO orders (product_id, buyer_id, qty, message) VALUES ($1, $2, $3, $4) RETURNING *`,
    [productId, buyerId, qty, message ?? null]
  );
  // sellerId included so the controller can fire a new-order notification
  // without a redundant second lookup of the product listing.
  return { ...result.rows[0], sellerId: product.seller_id };
}

export async function listMyOrders(buyerId: string) {
  const res = await query(
    `SELECT o.*, pl.title AS product_title, pl.photos AS product_photos, u.full_name AS seller_name
     FROM orders o
     JOIN product_listings pl ON pl.id = o.product_id
     JOIN users u ON u.id = pl.seller_id
     WHERE o.buyer_id = $1
     ORDER BY o.created_at DESC`,
    [buyerId]
  );
  return res.rows;
}

export async function listOrdersForSeller(sellerId: string) {
  const res = await query(
    `SELECT o.*, pl.title AS product_title, pl.photos AS product_photos, u.full_name AS buyer_name
     FROM orders o
     JOIN product_listings pl ON pl.id = o.product_id
     JOIN users u ON u.id = o.buyer_id
     WHERE pl.seller_id = $1
     ORDER BY o.created_at DESC`,
    [sellerId]
  );
  return res.rows;
}

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  interested: ['accepted', 'declined', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  declined: [],
  completed: [],
  cancelled: [],
};

export async function updateOrderStatus(orderId: string, actingUserId: string, newStatus: string) {
  return withTransaction(async (client) => {
    const orderRes = await client.query(
      `SELECT o.*, pl.seller_id, pl.qty AS listing_qty FROM orders o
       JOIN product_listings pl ON pl.id = o.product_id
       WHERE o.id = $1
       FOR UPDATE OF o`,
      [orderId]
    );
    if (orderRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Order not found.');
    const order = orderRes.rows[0];

    const isSeller = order.seller_id === actingUserId;
    const isBuyer = order.buyer_id === actingUserId;
    if (!isSeller && !isBuyer) {
      throw new ApiError(403, 'forbidden', 'You are not a participant in this order.');
    }
    if (['accepted', 'declined', 'completed'].includes(newStatus) && !isSeller) {
      throw new ApiError(403, 'forbidden', 'Only the seller can accept, decline, or complete an order.');
    }

    const allowed = VALID_ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new ApiError(400, 'invalid_transition', `Cannot move order from '${order.status}' to '${newStatus}'.`);
    }

    const updated = await client.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [
      newStatus,
      orderId,
    ]);

    if (newStatus === 'completed') {
      // Lock the listing row too — without this, two orders for the same
      // listing completing concurrently could both pass the qty check and
      // drive qty negative. GREATEST(..., 0) is a defensive floor on top
      // of the lock, not a substitute for it.
      const listingRes = await client.query('SELECT qty FROM product_listings WHERE id = $1 FOR UPDATE', [
        order.product_id,
      ]);
      const currentQty = listingRes.rows[0]?.qty ?? 0;
      const newQty = Math.max(currentQty - order.qty, 0);
      await client.query('UPDATE product_listings SET qty = $1 WHERE id = $2', [newQty, order.product_id]);
      if (newQty <= 0) {
        await client.query(`UPDATE product_listings SET status = 'sold' WHERE id = $1`, [order.product_id]);
      }
    }

    return { ...updated.rows[0], sellerId: order.seller_id };
  });
}
