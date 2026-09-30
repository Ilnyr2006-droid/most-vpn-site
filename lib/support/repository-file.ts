import { mkdir, open, readFile, rename, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { SupportCapacityError, SupportStorageError } from "@/lib/support/errors";
import type { SupportConversation, SupportMessage, SupportSnapshot } from "@/lib/support/types";

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "support-chat.json");
const maxConversations = 2_000;
const maxMessages = 10_000;
const maxMessagesPerConversation = 300;
const maxSerializedBytes = 25 * 1024 * 1024;

type SupportState = SupportSnapshot & {
  loaded: boolean;
  writing: Promise<void>;
};

declare global {
  // eslint-disable-next-line no-var
  var __mostSupportFileState: SupportState | undefined;
}

const state: SupportState = globalThis.__mostSupportFileState ?? {
  conversations: [],
  messages: [],
  loaded: false,
  writing: Promise.resolve(),
};

globalThis.__mostSupportFileState = state;

function isSnapshot(value: unknown): value is SupportSnapshot {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.conversations) && Array.isArray(record.messages);
}

async function ensureLoaded() {
  if (state.loaded) return;

  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!isSnapshot(parsed)) {
      throw new SupportStorageError("Support chat JSON has an invalid shape");
    }

    state.conversations = parsed.conversations;
    state.messages = parsed.messages;
    state.loaded = true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      state.conversations = [];
      state.messages = [];
      state.loaded = true;
      return;
    }

    state.loaded = false;
    throw new SupportStorageError(
      "Failed to read support chat storage; refusing to replace it with an empty database",
      { cause: error }
    );
  }
}

async function atomicWrite(serialized: string) {
  await mkdir(dataDir, { recursive: true });

  const tempFile = path.join(
    dataDir,
    `support-chat.${process.pid}.${randomUUID()}.tmp`
  );

  let handle: Awaited<ReturnType<typeof open>> | null = null;

  try {
    handle = await open(tempFile, "wx", 0o600);
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;

    await rename(tempFile, dataFile);
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await unlink(tempFile).catch(() => undefined);
    throw error;
  }
}

async function persist() {
  const snapshot: SupportSnapshot = {
    conversations: state.conversations,
    messages: state.messages,
  };
  const serialized = JSON.stringify(snapshot, null, 2);

  if (Buffer.byteLength(serialized, "utf8") > maxSerializedBytes) {
    throw new SupportCapacityError("Support storage file limit reached");
  }

  const write = state.writing.then(() => atomicWrite(serialized));
  state.writing = write.catch(() => undefined);
  await write;
}

function now() {
  return new Date().toISOString();
}

export async function getOrCreateConversation(input: {
  visitorId: string;
  userId: string | null;
}) {
  await ensureLoaded();

  let conversation =
    state.conversations
      .filter((item) => item.status === "open")
      .find((item) =>
        input.userId
          ? item.userId === input.userId || item.visitorId === input.visitorId
          : item.visitorId === input.visitorId
      );

  if (conversation) {
    if (!conversation.userId && input.userId) {
      const previousUserId = conversation.userId;
      const previousUpdatedAt = conversation.updatedAt;
      conversation.userId = input.userId;
      conversation.updatedAt = now();

      try {
        await persist();
      } catch (error) {
        conversation.userId = previousUserId;
        conversation.updatedAt = previousUpdatedAt;
        throw error;
      }
    }
    return conversation;
  }

  if (state.conversations.length >= maxConversations) {
    throw new SupportCapacityError("Conversation limit reached");
  }

  const createdAt = now();
  conversation = {
    id: `sup_${randomUUID()}`,
    visitorId: input.visitorId,
    userId: input.userId,
    status: "open",
    createdAt,
    updatedAt: createdAt,
  };

  state.conversations.push(conversation);

  try {
    await persist();
  } catch (error) {
    state.conversations.pop();
    throw error;
  }

  return conversation;
}

export async function getConversation(id: string) {
  await ensureLoaded();
  return state.conversations.find((item) => item.id === id) ?? null;
}

export async function listMessages(conversationId: string) {
  await ensureLoaded();
  return state.messages
    .filter((item) => item.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addMessage(input: {
  conversationId: string;
  sender: "user" | "operator";
  text: string;
}) {
  await ensureLoaded();

  const conversation = state.conversations.find(
    (item) => item.id === input.conversationId
  );
  if (!conversation || conversation.status !== "open") {
    throw new Error("Conversation not found");
  }

  if (state.messages.length >= maxMessages) {
    throw new SupportCapacityError("Global message limit reached");
  }

  const conversationMessageCount = state.messages.reduce(
    (count, item) =>
      count + (item.conversationId === input.conversationId ? 1 : 0),
    0
  );

  if (conversationMessageCount >= maxMessagesPerConversation) {
    throw new SupportCapacityError("Conversation message limit reached");
  }

  const message: SupportMessage = {
    id: `msg_${randomUUID()}`,
    conversationId: input.conversationId,
    sender: input.sender,
    text: input.text,
    createdAt: now(),
  };

  const previousUpdatedAt = conversation.updatedAt;
  state.messages.push(message);
  conversation.updatedAt = message.createdAt;

  try {
    await persist();
  } catch (error) {
    state.messages.pop();
    conversation.updatedAt = previousUpdatedAt;
    throw error;
  }

  return message;
}

export async function listConversations() {
  await ensureLoaded();

  return state.conversations
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 100)
    .map((conversation) => ({
      ...conversation,
      messages: state.messages
        .filter((message) => message.conversationId === conversation.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
}
