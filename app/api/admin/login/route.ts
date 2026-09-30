import { NextResponse } from "next/server";
import {
  adminCredentialsConfigured,
  createAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin/session";
import { readJsonBodyLimited } from "@/lib/support/security";
import {
  enforceRateLimits,
  RateLimitUnavailableError,
} from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Слишком много попыток входа. Попробуйте позже." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

export async function POST(request: Request) {
  if (!adminCredentialsConfigured()) {
    return NextResponse.json(
      { error: "Вход администратора не настроен" },
      { status: 503 }
    );
  }

  const parsed = await readJsonBodyLimited<{
    username?: unknown;
    password?: unknown;
  }>(request, 2048);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status }
    );
  }

  const username =
    typeof parsed.value.username === "string"
      ? parsed.value.username.trim().slice(0, 80)
      : "";
  const password =
    typeof parsed.value.password === "string"
      ? parsed.value.password.slice(0, 256)
      : "";

  const ip = getRequestIp(request);
  const usernameKey = username.toLowerCase() || "empty";

  let rate;
  try {
    rate = await enforceRateLimits([
      {
        key: `admin:login:ip:${ip}:5m`,
        limit: 5,
        windowMs: 5 * 60_000,
      },
      {
        key: `admin:login:ip:${ip}:1h`,
        limit: 20,
        windowMs: 60 * 60_000,
      },
      {
        key: `admin:login:user:${usernameKey}:15m`,
        limit: 8,
        windowMs: 15 * 60_000,
      },
    ]);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json(
        { error: "Вход администратора временно недоступен" },
        { status: 503 }
      );
    }
    throw error;
  }

  if (!rate.ok) return rateLimited(rate.retryAfterSeconds);

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json(
      { error: "Неверный логин или пароль" },
      { status: 401 }
    );
  }

  await createAdminSession(username);
  return NextResponse.json({ ok: true });
}
