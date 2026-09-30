import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { getPostgresPool } from "@/lib/db/postgres";
import { SupportCapacityError } from "@/lib/support/errors";
import type { SupportConversation, SupportMessage } from "@/lib/support/types";

const maxMessagesPerConversation = 300;
const adminConversationLimit = 100;

type ConversationRow = {
  id: string;
  visitor_id: string;
  user_id: string | null;
  status: "open" | "closed";
  created_at: Date | string;
  updated_at: Date | string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender: "user" | "operator";
  text: string;
  created_at: Date | string;
};

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapConversation(row: ConversationRow): SupportConversation {
  return {
    id: row.id,
    visitorId: row.visitor_id,
    userId: row.user_id,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapMessage(row: MessageRow): SupportMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sender: row.sender,
    text: row.text,
    createdAt: iso(row.created_at),
  };
}

async function advisoryLock(client: PoolClient, keys: string[]) {
  for (const key of [...new Set(keys)].sort()) {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [key]
    );
  }
}

export async function getOrCreateConversation(input: {
  visitorId: string;
  userId: string | null;
}) {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await advisoryLock(
      client,
      input.userId
        ? [`support:visitor:${input.visitorId}`, `support:user:${input.userId}`]
        : [`support:visitor:${input.visitorId}`]
    );

    const existing = await client.query<ConversationRow>(
      `
        SELECT id, visitor_id, user_id, status, created_at, updated_at
        FROM support_conversations
        WHERE status = 'open'
          AND (
            visitor_id = $1
            OR ($2::text IS NOT NULL AND user_id = $2)
          )
        ORDER BY
          CASE WHEN user_id = $2 THEN 0 ELSE 1 END,
          updated_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [input.visitorId, input.userId]
    );

    if (existing.rows[0]) {
      let row = existing.rows[0];

      if (!row.user_id && input.userId) {
        const updated = await client.query<ConversationRow>(
          `
            UPDATE support_conversations
            SET user_id = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, visitor_id, user_id, status, created_at, updated_at
          `,
          [row.id, input.userId]
        );
        row = updated.rows[0];
      }

      await client.query("COMMIT");
      return mapConversation(row);
    }

    const id = `sup_${randomUUID()}`;
    const created = await client.query<ConversationRow>(
      `
        INSERT INTO support_conversations
          (id, visitor_id, user_id, status, created_at, updated_at)
        VALUES
          ($1, $2, $3, 'open', NOW(), NOW())
        RETURNING id, visitor_id, user_id, status, created_at, updated_at
      `,
      [id, input.visitorId, input.userId]
    );

    await client.query("COMMIT");
    return mapConversation(created.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getConversation(id: string) {
  const result = await getPostgresPool().query<ConversationRow>(
    `
      SELECT id, visitor_id, user_id, status, created_at, updated_at
      FROM support_conversations
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] ? mapConversation(result.rows[0]) : null;
}

export async function listMessages(conversationId: string) {
  const result = await getPostgresPool().query<MessageRow>(
    `
      SELECT id, conversation_id, sender, text, created_at
      FROM support_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `,
    [conversationId]
  );

  return result.rows.map(mapMessage);
}

export async function addMessage(input: {
  conversationId: string;
  sender: "user" | "operator";
  text: string;
}) {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const conversation = await client.query<ConversationRow>(
      `
        SELECT id, visitor_id, user_id, status, created_at, updated_at
        FROM support_conversations
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [input.conversationId]
    );

    if (!conversation.rows[0] || conversation.rows[0].status !== "open") {
      throw new Error("Conversation not found");
    }

    const count = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM support_messages WHERE conversation_id = $1",
      [input.conversationId]
    );

    if (Number(count.rows[0]?.count ?? 0) >= maxMessagesPerConversation) {
      throw new SupportCapacityError("Conversation message limit reached");
    }

    const id = `msg_${randomUUID()}`;
    const inserted = await client.query<MessageRow>(
      `
        INSERT INTO support_messages
          (id, conversation_id, sender, text, created_at)
        VALUES
          ($1, $2, $3, $4, NOW())
        RETURNING id, conversation_id, sender, text, created_at
      `,
      [id, input.conversationId, input.sender, input.text]
    );

    await client.query(
      "UPDATE support_conversations SET updated_at = NOW() WHERE id = $1",
      [input.conversationId]
    );

    await client.query("COMMIT");
    return mapMessage(inserted.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listConversations() {
  const pool = getPostgresPool();

  const conversationsResult = await pool.query<ConversationRow>(
    `
      SELECT id, visitor_id, user_id, status, created_at, updated_at
      FROM support_conversations
      ORDER BY updated_at DESC
      LIMIT $1
    `,
    [adminConversationLimit]
  );

  const conversations = conversationsResult.rows.map(mapConversation);
  if (conversations.length === 0) return [];

  const ids = conversations.map((item) => item.id);
  const messagesResult = await pool.query<MessageRow>(
    `
      SELECT id, conversation_id, sender, text, created_at
      FROM support_messages
      WHERE conversation_id = ANY($1::text[])
      ORDER BY created_at ASC
    `,
    [ids]
  );

  const messagesByConversation = new Map<string, SupportMessage[]>();
  for (const row of messagesResult.rows) {
    const message = mapMessage(row);
    const current = messagesByConversation.get(message.conversationId) ?? [];
    current.push(message);
    messagesByConversation.set(message.conversationId, current);
  }

  return conversations.map((conversation) => ({
    ...conversation,
    messages: messagesByConversation.get(conversation.id) ?? [],
  }));
}
