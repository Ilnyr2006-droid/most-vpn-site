import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { getOrCreateConversation, SupportCapacityError } from "@/lib/support/repository";
import { enforceRateLimits, RateLimitUnavailableError } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { ensureGuestVisitor, setGuestCookie } from "@/lib/support/guest-session";

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Слишком много запросов. Попробуйте немного позже." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

export async function POST(request: NextRequest) {
  const guest = ensureGuestVisitor(request);
  if (!guest.ok) {
    return NextResponse.json(
      { error: "Гостевой чат временно недоступен" },
      { status: 503 }
    );
  }

  const ip = getRequestIp(request);
  let rate;
  try {
    rate = await enforceRateLimits([
    { key: `support:conversation:ip:${ip}:5m`, limit: 20, windowMs: 5 * 60_000 },
    { key: `support:conversation:ip:${ip}:1h`, limit: 100, windowMs: 60 * 60_000 },
    { key: `support:conversation:visitor:${guest.visitorId}:5m`, limit: 8, windowMs: 5 * 60_000 },
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

  const current = await getAuthSession();

  try {
    const conversation = await getOrCreateConversation({
      visitorId: guest.visitorId,
      userId: current?.user.id ?? null,
    });

    const response = NextResponse.json({
      conversation: {
        id: conversation.id,
        status: conversation.status,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });

    setGuestCookie(response, guest.cookieValue);
    return response;
  } catch (error) {
    if (error instanceof SupportCapacityError) {
      return NextResponse.json(
        { error: "Чат временно перегружен. Попробуйте позже." },
        { status: 503 }
      );
    }
    throw error;
  }
}
