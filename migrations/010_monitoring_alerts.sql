CREATE TABLE IF NOT EXISTS monitoring_alerts (
  alert_key VARCHAR(180) PRIMARY KEY,
  state VARCHAR(16) NOT NULL CHECK (state IN ('UP', 'DOWN')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ
);
