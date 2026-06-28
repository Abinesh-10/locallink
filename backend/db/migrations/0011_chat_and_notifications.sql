-- 0011_chat_and_notifications.sql
-- Phase 7 tables, schema-first.

CREATE TABLE chat_rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a_id, user_b_id),
  -- Per doc: "always store lower uuid as user_a" — enforced here, application
  -- layer is still responsible for sorting the pair before insert.
  CONSTRAINT chat_rooms_ordered_pair_chk CHECK (user_a_id < user_b_id)
);

CREATE INDEX idx_chat_rooms_user_a ON chat_rooms(user_a_id, last_message_at DESC);
CREATE INDEX idx_chat_rooms_user_b ON chat_rooms(user_b_id, last_message_at DESC);

CREATE TYPE chat_message_type AS ENUM ('text', 'image', 'location');

CREATE TABLE chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         chat_message_type NOT NULL DEFAULT 'text',
  body         text NOT NULL, -- text content, Cloudinary URL, or JSON {lat,lng}
  delivered_at timestamptz,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
