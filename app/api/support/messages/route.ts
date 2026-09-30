import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import {
  addMessage,
  getConversation,
  listMessages,
  SupportCapacityError,
} from "@/lib/support/repository";
import { readJsonBodyLimited } from "@/lib/support/security";
import { enforceRateLimits, RateLimitUnavailableError } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { readGuestVisitorId } from "@/lib/support/guest-session";

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\r\n/g, "\n").slice(0, 2000);
}

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Слишком много запросов. Попробуйте немного позже." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

async function accessContext(request: NextRequest) {
  const current = await getAuthSession();
  const visitorId = readGuestVisitorId(request);

  return {
    current,
    visitorId,
    rateIdentity: current?.user.id
      ? `user:${current.user.id}`
      : visitorId
        ? `visitor:${visitorId}`
        : "anonymous",
  };
}

async function canAccess(
  conversationId: string,
  context: Awaited<ReturnType<typeof accessContext>>
) {
  const conversation = await getConversation(conversationId);
  if (!conversation) return null;

  if (context.current?.user.id && conversation.userId === context.current.user.id) {
    return conversation;
  }

  if (context.visitorId && conversation.visitorId === context.visitorId) {
    return conversation;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const ip = getRequestIp(request);

  if (!conversationId || conversationId.length > 100) {
    return NextResponse.json({ error: "conversationId обязателен" }, { status: 400 });
  }

  const context = await accessContext(request);
  let rate;
  try {
    rate = await enforceRateLimits([
      { key: `support:read:ip:${ip}:1m`, limit: 240, windowMs: 60_000 },
      {
        key: `support:read:${context.rateIdentity}:1m`,
        limit: 80,
        windowMs: 60_000,
      },
    ]);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json(
        { error: "Защита от злоупотреблений временно недоступна" },
        { status: 503 }
      );
    }
    throw error;
  }

  if (!rate.ok) return rateLimited(rate.retryAfterSeconds);

  const conversation = await canAccess(conversationId, context);
  if (!conversation) {
    return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      status: conversation.status,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    messages: await listMessages(conversationId),
  });
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBodyLimited<{
    conversationId?: unknown;
    text?: unknown;
  }>(request, 4096);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const conversationId =
    typeof parsed.value.conversationId === "string" ? parsed.value.conversationId : "";
  const text = cleanText(parsed.value.text);

  if (!conversationId || conversationId.length > 100 || !text) {
    return NextResponse.json({ error: "Сообщение пустое" }, { status: 400 });
  }

  const context = await accessContext(request);
  const ip = getRequestIp(request);
  let rate;
  try {
    rate = await enforceRateLimits([
      { key: `support:message:ip:${ip}:1m`, limit: 30, windowMs: 60_000 },
      { key: `support:message:ip:${ip}:1h`, limit: 300, windowMs: 60 * 60_000 },
      {
        key: `support:message:${context.rateIdentity}:1m`,
        limit: 15,
        windowMs: 60_000,
      },
      {
        key: `support:message:conversation:${conversationId}:1m`,
        limit: 20,
        windowMs: 60_000,
      },
    ]);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json(
        { error: "Защита от злоупотреблений временно недоступна" },
        { status: 503 }
      );
    }
    throw error;
  }

  if (!rate.ok) return rateLimited(rate.retryAfterSeconds);

  const conversation = await canAccess(conversationId, context);
  if (!conversation) {
    return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  }

  try {
    const message = await addMessage({
      conversationId,
      sender: "user",
      text,
    });

    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof SupportCapacityError) {
      return NextResponse.json(
        { error: "Лимит истории чата достигнут. Обратитесь в поддержку позже." },
        { status: 503 }
      );
    }
    throw error;
  }
}
