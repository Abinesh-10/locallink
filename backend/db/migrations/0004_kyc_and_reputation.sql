-- 0004_kyc_and_reputation.sql
-- Schema-first per doc: these tables back Phase 2's verification badge and
-- trust score, but are created now so worker_profiles etc. (Phase 2) can
-- reference users without a later migration needing to backfill FKs.

CREATE TYPE kyc_type AS ENUM ('aadhaar', 'driving_license', 'gst');
CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected');

CREATE TABLE identity_verifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         kyc_type NOT NULL,
  status       kyc_status NOT NULL DEFAULT 'pending',
  provider     text, -- e.g. 'surepass', 'hyperverge'
  provider_ref text, -- provider's transaction/reference ID
  verified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

CREATE TRIGGER trg_identity_verifications_updated_at
  BEFORE UPDATE ON identity_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE trust_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

CREATE TABLE user_reputation (
  user_id                     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating_avg                  numeric NOT NULL DEFAULT 0,
  rating_count                int NOT NULL DEFAULT 0,
  completed_jobs               int NOT NULL DEFAULT 0,
  response_time_avg_minutes   int,
  response_rate_pct           int,
  trust_score                 numeric NOT NULL DEFAULT 0,
  tier                         trust_tier NOT NULL DEFAULT 'bronze',
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_reputation_updated_at
  BEFORE UPDATE ON user_reputation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
