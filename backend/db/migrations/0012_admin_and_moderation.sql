-- 0012_admin_and_moderation.sql
-- Phase 7 tables, schema-first. Final migration in the schema-first set.

CREATE TYPE report_status AS ENUM ('open', 'reviewed', 'dismissed', 'actioned');

CREATE TABLE reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type  text NOT NULL,
  target_id    uuid NOT NULL,
  reason       text NOT NULL,
  status       report_status NOT NULL DEFAULT 'open',
  created_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_by  uuid REFERENCES users(id),
  reviewed_at  timestamptz
);

CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);

CREATE TABLE admin_actions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     text NOT NULL,
  target_type text,
  target_id  uuid,
  meta       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC);

-- category_overrides: lets admins rename/disable category labels per-locale
-- without a code deploy. Referenced by doc's admin "category CRUD" feature.
CREATE TABLE category_overrides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_type text NOT NULL, -- 'service' | 'rental' | 'product'
  category_id   uuid NOT NULL,
  is_disabled   boolean NOT NULL DEFAULT false,
  overrides     jsonb NOT NULL DEFAULT '{}',
  updated_by    uuid REFERENCES users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_type, category_id)
);

CREATE TRIGGER trg_category_overrides_updated_at
  BEFORE UPDATE ON category_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
