CREATE TABLE IF NOT EXISTS vpn_nodes (
  id TEXT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('SETUP_REQUIRED', 'CONNECTED')),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS vpn_nodes_created_idx ON vpn_nodes(created_at DESC);
