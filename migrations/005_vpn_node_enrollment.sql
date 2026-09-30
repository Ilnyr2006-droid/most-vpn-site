ALTER TABLE vpn_nodes DROP CONSTRAINT IF EXISTS vpn_nodes_status_check;

ALTER TABLE vpn_nodes
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NOT NULL DEFAULT '--',
  ADD COLUMN IF NOT EXISTS domain VARCHAR(253) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agent_version VARCHAR(40),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS endpoint_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS enrollment_token_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS enrollment_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_token_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ;

ALTER TABLE vpn_nodes
  ADD CONSTRAINT vpn_nodes_status_check
  CHECK (status IN ('SETUP_REQUIRED', 'ENROLLING', 'ONLINE', 'DEGRADED', 'OFFLINE', 'DRAINING'));

CREATE UNIQUE INDEX IF NOT EXISTS vpn_nodes_enrollment_token_idx
  ON vpn_nodes(enrollment_token_hash) WHERE enrollment_token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vpn_nodes_agent_token_idx
  ON vpn_nodes(agent_token_hash) WHERE agent_token_hash IS NOT NULL;
