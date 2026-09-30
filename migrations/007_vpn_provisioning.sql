ALTER TABLE device_access_credentials
  ADD COLUMN IF NOT EXISTS node_id TEXT REFERENCES vpn_nodes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'REVOKE_PENDING', 'REVOKED', 'ERROR')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS device_access_credentials_client_id_idx
  ON device_access_credentials(client_id) WHERE client_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS vpn_node_commands (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES vpn_nodes(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL REFERENCES device_access_credentials(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('PROVISION', 'REVOKE')),
  encrypted_payload TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DONE', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_dispatched_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS vpn_node_commands_pending_idx
  ON vpn_node_commands(node_id, created_at) WHERE status = 'PENDING';
