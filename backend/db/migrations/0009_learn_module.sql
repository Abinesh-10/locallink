-- 0009_learn_module.sql
-- Phase 6 tables, schema-first.

CREATE TABLE trainer_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  subjects       text[] NOT NULL DEFAULT '{}',
  qualifications text,
  bio            text,
  is_verified    boolean NOT NULL DEFAULT false,
  rating_avg     numeric NOT NULL DEFAULT 0,
  rating_count   int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trainer_profiles_updated_at
  BEFORE UPDATE ON trainer_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE course_mode AS ENUM ('online', 'offline', 'hybrid');

CREATE TABLE courses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  title       text NOT NULL,
  description text,
  mode        course_mode NOT NULL,
  language    text,
  price       numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  capacity    int NOT NULL CHECK (capacity >= 1),
  schedule    jsonb,
  lat         double precision,
  lng         double precision,
  is_active   boolean NOT NULL DEFAULT true,
  rating_avg  numeric NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_subject_active ON courses(subject, is_active);
CREATE INDEX idx_courses_geo ON courses USING gist (ll_to_earth(lat, lng)) WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE enrollment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TABLE enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      enrollment_status NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id, created_at DESC);
