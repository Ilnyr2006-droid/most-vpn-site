CREATE TABLE IF NOT EXISTS support_conversations (
  id TEXT PRIMARY KEY,
  visitor_id VARCHAR(120) NOT NULL,
  user_id TEXT,
  status VARCHAR(16) NOT NULL CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL
    REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender VARCHAR(16) NOT NULL CHECK (sender IN ('user', 'operator')),
  text VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS support_open_visitor_unique
  ON support_conversations(visitor_id)
  WHERE status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS support_open_user_unique
  ON support_conversations(user_id)
  WHERE status = 'open' AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_conversations_updated_idx
  ON support_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS support_messages_conversation_created_idx
  ON support_messages(conversation_id, created_at ASC);
