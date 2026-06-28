-- 0002_users_and_roles.sql
-- Core identity tables. A user can hold many roles (stored in user_roles,
-- never as a column on users, per doc §2: "stored in user_roles, never on users").

CREATE TYPE language_code AS ENUM ('en', 'ta', 'hi', 'te', 'ml');

CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               citext UNIQUE,
  phone               text UNIQUE,
  password_hash       text, -- null for Google-only / phone-only accounts
  google_id           text UNIQUE,
  full_name           text NOT NULL,
  photo_url           text,
  preferred_language  language_code NOT NULL DEFAULT 'en',
  lat                 double precision,
  lng                 double precision,
  address             text,
  search_radius_km    int NOT NULL DEFAULT 10 CHECK (search_radius_km IN (5, 10, 15, 25)),
  is_email_verified   boolean NOT NULL DEFAULT false,
  is_phone_verified   boolean NOT NULL DEFAULT false,
  is_suspended        boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_identity_method_chk CHECK (
    email IS NOT NULL OR phone IS NOT NULL OR google_id IS NOT NULL
  )
);

CREATE INDEX idx_users_lat_lng ON users USING gist (ll_to_earth(lat, lng)) WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE TABLE roles (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text UNIQUE NOT NULL
);

CREATE TABLE user_roles (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id  uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- updated_at auto-touch trigger, reused by every table below that has the column.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
