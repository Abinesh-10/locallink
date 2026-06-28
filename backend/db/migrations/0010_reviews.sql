-- 0010_reviews.sql
-- Single polymorphic reviews table reused across hire/rent/market/learn,
-- per doc's "reuse reviews" notation under Phases 3, 4, and 6.

CREATE TYPE review_target_type AS ENUM ('worker', 'rental', 'product', 'course');

CREATE TABLE reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type  review_target_type NOT NULL,
  target_id    uuid NOT NULL,
  request_ref  uuid, -- e.g. service_requests.id / rental_bookings.id / orders.id / enrollments.id
  rating       int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, target_type, target_id, request_ref)
);

CREATE INDEX idx_reviews_target ON reviews(target_type, target_id);

-- Recomputes rating_avg/rating_count on the relevant target table whenever a
-- review is inserted. Per doc §3: "DB triggers maintain rating_avg/
-- rating_count on reviews insert/update". Defined now; first fires in Phase 2+.
CREATE OR REPLACE FUNCTION recompute_target_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg numeric;
  v_count int;
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
    INTO v_avg, v_count
    FROM reviews
   WHERE target_type = NEW.target_type AND target_id = NEW.target_id;

  IF NEW.target_type = 'worker' THEN
    UPDATE worker_profiles SET rating_avg = v_avg, rating_count = v_count WHERE user_id = NEW.target_id;
    UPDATE user_reputation SET rating_avg = v_avg, rating_count = v_count WHERE user_id = NEW.target_id;
  ELSIF NEW.target_type = 'rental' THEN
    UPDATE rental_listings SET rating_avg = v_avg, rating_count = v_count WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'product' THEN
    -- product_listings has no rating columns per doc schema; no-op by design.
    NULL;
  ELSIF NEW.target_type = 'course' THEN
    UPDATE courses SET rating_avg = v_avg, rating_count = v_count WHERE id = NEW.target_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_recompute_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recompute_target_rating();
