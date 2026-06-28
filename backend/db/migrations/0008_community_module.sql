-- 0008_community_module.sql
-- Phase 5 tables, schema-first.

CREATE TYPE community_request_type AS ENUM ('blood', 'volunteer', 'emergency', 'medical', 'other');
CREATE TYPE community_urgency AS ENUM ('low', 'normal', 'urgent', 'critical');
CREATE TYPE community_status AS ENUM ('open', 'closed');
CREATE TYPE blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

CREATE TABLE community_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            community_request_type NOT NULL,
  urgency         community_urgency NOT NULL DEFAULT 'normal',
  blood_group     blood_group,
  title           text NOT NULL,
  description     text,
  lat             double precision,
  lng             double precision,
  contact_visible boolean NOT NULL DEFAULT true,
  is_sos          boolean NOT NULL DEFAULT false,
  expires_at      timestamptz,
  status          community_status NOT NULL DEFAULT 'open',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_requests_expiry_chk CHECK (expires_at IS NULL OR expires_at <= created_at + interval '90 days')
);

CREATE INDEX idx_community_requests_geo ON community_requests USING gist (ll_to_earth(lat, lng)) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX idx_community_requests_type_status ON community_requests(type, status);
CREATE INDEX idx_community_requests_sos ON community_requests(is_sos, status) WHERE is_sos = true;

CREATE TABLE community_responses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL REFERENCES community_requests(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, responder_id)
);

CREATE TYPE lost_found_kind AS ENUM ('lost', 'found');
CREATE TYPE lost_found_status AS ENUM ('open', 'resolved');

CREATE TABLE lost_and_found (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind            lost_found_kind NOT NULL,
  title           text NOT NULL,
  description     text,
  photos          text[] NOT NULL DEFAULT '{}',
  last_seen_lat   double precision,
  last_seen_lng   double precision,
  last_seen_at    timestamptz,
  status          lost_found_status NOT NULL DEFAULT 'open',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lost_and_found_geo ON lost_and_found USING gist (ll_to_earth(last_seen_lat, last_seen_lng)) WHERE last_seen_lat IS NOT NULL AND last_seen_lng IS NOT NULL;
