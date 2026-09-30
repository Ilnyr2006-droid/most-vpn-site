CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  plan_id VARCHAR(16) NOT NULL CHECK (plan_id IN ('monthly', 'annual')),
  status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  device_limit SMALLINT NOT NULL CHECK (device_limit > 0 AND device_limit <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_ends_idx
  ON subscriptions(user_id, ends_at DESC);

CREATE TABLE IF NOT EXISTS user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  platform VARCHAR(16) NOT NULL CHECK (platform IN ('iOS', 'Android', 'Windows', 'macOS', 'Linux')),
  status VARCHAR(16) NOT NULL CHECK (status IN ('CONNECTED', 'DISCONNECTED')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_devices_user_added_idx
  ON user_devices(user_id, added_at DESC);

CREATE TABLE IF NOT EXISTS device_access_credentials (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS device_access_credentials_active_device_idx
  ON device_access_credentials(device_id) WHERE revoked_at IS NULL;
