-- 0001_extensions.sql
-- Enables UUID generation, case-insensitive text, and geo-distance support.
-- earthdistance + cube power the radius search (earth_box / ll_to_earth) used
-- by every "browse nearby X" endpoint from Phase 2 onward.
-- btree_gist powers the rental_bookings EXCLUDE constraint (Phase 3).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
CREATE EXTENSION IF NOT EXISTS btree_gist;
