-- 0006_rent_module.sql
-- Phase 3 tables, schema-first. The EXCLUDE constraint on rental_bookings
-- needs btree_gist (enabled in 0001), which is why extensions load first.

CREATE TABLE rental_categories (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug   text UNIQUE NOT NULL,
  names  jsonb NOT NULL DEFAULT '{}',
  icon   text
);

CREATE TYPE delivery_option AS ENUM ('pickup', 'delivery', 'both');

CREATE TABLE rental_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES rental_categories(id),
  title           text NOT NULL,
  description     text,
  hourly_rate     numeric CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  daily_rate      numeric CHECK (daily_rate IS NULL OR daily_rate >= 0),
  weekly_rate     numeric CHECK (weekly_rate IS NULL OR weekly_rate >= 0),
  deposit         numeric NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  delivery_option delivery_option NOT NULL DEFAULT 'pickup',
  photos          text[] NOT NULL DEFAULT '{}',
  lat             double precision,
  lng             double precision,
  is_active       boolean NOT NULL DEFAULT true,
  rating_avg      numeric NOT NULL DEFAULT 0,
  rating_count    int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rental_listings_category_active ON rental_listings(category_id, is_active);
CREATE INDEX idx_rental_listings_geo ON rental_listings USING gist (ll_to_earth(lat, lng)) WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE TRIGGER trg_rental_listings_updated_at
  BEFORE UPDATE ON rental_listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE rental_booking_status AS ENUM ('requested', 'confirmed', 'declined', 'returned', 'cancelled');

CREATE TABLE rental_bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES rental_listings(id) ON DELETE CASCADE,
  renter_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period        tstzrange NOT NULL,
  status        rental_booking_status NOT NULL DEFAULT 'requested',
  total_amount  numeric CHECK (total_amount IS NULL OR total_amount >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Prevents double-booking: no two active (requested/confirmed) bookings
  -- for the same listing may have overlapping periods.
  EXCLUDE USING gist (listing_id WITH =, period WITH &&)
    WHERE (status IN ('requested', 'confirmed'))
);

CREATE INDEX idx_rental_bookings_renter ON rental_bookings(renter_id, created_at DESC);

CREATE TRIGGER trg_rental_bookings_updated_at
  BEFORE UPDATE ON rental_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
