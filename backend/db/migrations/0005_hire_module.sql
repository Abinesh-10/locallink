-- 0005_hire_module.sql
-- Phase 2 tables, created now (schema-first) per doc instructions.
-- No backend logic operates on these until Phase 2 is built.

CREATE TABLE service_categories (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug     text UNIQUE NOT NULL,
  name_en  text NOT NULL,
  name_ta  text,
  name_hi  text,
  name_te  text,
  name_ml  text,
  icon     text
);

CREATE TABLE worker_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  category_id      uuid REFERENCES service_categories(id),
  sub_skills       text[] NOT NULL DEFAULT '{}',
  experience_years int,
  hourly_rate      numeric CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  day_rate         numeric CHECK (day_rate IS NULL OR day_rate >= 0),
  bio              text,
  portfolio_urls   text[] NOT NULL DEFAULT '{}',
  is_available     boolean NOT NULL DEFAULT true,
  is_verified      boolean NOT NULL DEFAULT false,
  rating_avg       numeric NOT NULL DEFAULT 0,
  rating_count     int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_worker_profiles_category_available ON worker_profiles(category_id, is_available);

CREATE TRIGGER trg_worker_profiles_updated_at
  BEFORE UPDATE ON worker_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE service_request_status AS ENUM ('pending', 'accepted', 'declined', 'completed', 'cancelled');

CREATE TABLE service_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_for timestamptz,
  description   text,
  status        service_request_status NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_requests_customer ON service_requests(customer_id, created_at DESC);
CREATE INDEX idx_service_requests_worker ON service_requests(worker_id, created_at DESC);

CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
