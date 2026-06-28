-- 0007_market_module.sql
-- Phase 4 tables, schema-first.

CREATE TABLE product_categories (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug      text UNIQUE NOT NULL,
  names     jsonb NOT NULL DEFAULT '{}',
  parent_id uuid REFERENCES product_categories(id)
);

CREATE TYPE product_condition AS ENUM ('new', 'like_new', 'used', 'refurbished');
CREATE TYPE product_status AS ENUM ('available', 'reserved', 'sold');
CREATE TYPE product_delivery_option AS ENUM ('pickup', 'local_delivery', 'both');

CREATE TABLE product_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES product_categories(id),
  title           text NOT NULL,
  description     text,
  price           numeric NOT NULL CHECK (price >= 0),
  condition       product_condition NOT NULL,
  qty             int NOT NULL DEFAULT 1 CHECK (qty >= 0),
  photos          text[] NOT NULL DEFAULT '{}',
  lat             double precision,
  lng             double precision,
  delivery_option product_delivery_option NOT NULL DEFAULT 'pickup',
  status          product_status NOT NULL DEFAULT 'available',
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_listings_category_status ON product_listings(category_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_listings_geo ON product_listings USING gist (ll_to_earth(lat, lng)) WHERE lat IS NOT NULL AND lng IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_product_listings_updated_at
  BEFORE UPDATE ON product_listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE order_status AS ENUM ('interested', 'accepted', 'declined', 'completed', 'cancelled');

CREATE TABLE orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
  buyer_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qty         int NOT NULL DEFAULT 1 CHECK (qty > 0),
  message     text,
  status      order_status NOT NULL DEFAULT 'interested',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_product ON orders(product_id);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
