ALTER TABLE bookings ADD COLUMN idempotency_key TEXT;
ALTER TABLE bookings ADD COLUMN attendee_time_zone TEXT;
ALTER TABLE bookings ADD COLUMN thread_id TEXT;
ALTER TABLE bookings ADD COLUMN event_url TEXT;
ALTER TABLE bookings ADD COLUMN cancelled_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_idx ON bookings(idempotency_key);
