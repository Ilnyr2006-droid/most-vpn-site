-- A device receives an independent credential on every published node.
DROP INDEX IF EXISTS device_access_credentials_active_device_idx;
CREATE UNIQUE INDEX IF NOT EXISTS device_access_credentials_active_device_node_idx
  ON device_access_credentials(device_id, node_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS device_subscription_tokens (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  encrypted_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS device_subscription_tokens_active_device_idx
  ON device_subscription_tokens(device_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vpn_node_commands_pending_credential_kind_idx
  ON vpn_node_commands(credential_id, kind) WHERE status = 'PENDING';
