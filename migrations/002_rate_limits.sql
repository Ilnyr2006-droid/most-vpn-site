CREATE TABLE IF NOT EXISTS request_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL CHECK (count >= 0),
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS request_rate_limits_reset_idx
  ON request_rate_limits(reset_at);
