import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const cookieName = "most_support_guest";
const maxAge = 60 * 60 * 24 * 30;
const minSecretLength = 32;

declare global {
  // eslint-disable-next-line no-var
  var __mostSupportDevGuestSecret: string | undefined;
}

function getSecret() {
  const configured = process.env.SUPPORT_GUEST_SESSION_SECRET?.trim();
  if (configured && configured.length >= minSecretLength) return configured;

  if (process.env.NODE_ENV === "production") return null;

  if (!globalThis.__mostSupportDevGuestSecret) {
    globalThis.__mostSupportDevGuestSecret = randomBytes(32).toString("base64url");
  }
  return globalThis.__mostSupportDevGuestSecret;
}

function sign(visitorId: string, secret: string) {
  return createHmac("sha256", secret).update(visitorId).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function createToken(visitorId: string, secret: string) {
  return visitorId + "." + sign(visitorId, secret);
}

export function readGuestVisitorId(request: NextRequest) {
  const secret = getSecret();
  if (!secret) return null;

  const token = request.cookies.get(cookieName)?.value;
  if (!token) return null;

  const [visitorId, signature, extra] = token.split(".");
  if (!visitorId || !signature || extra) return null;
  if (!/^gst_[A-Za-z0-9_-]{20,80}$/.test(visitorId)) return null;

  const expected = sign(visitorId, secret);
  if (!safeEqual(signature, expected)) return null;

  return visitorId;
}

export function ensureGuestVisitor(request: NextRequest) {
  const secret = getSecret();
  if (!secret) {
    return {
      ok: false as const,
      error: "SUPPORT_GUEST_SESSION_SECRET is required in production",
    };
  }

  const existing = readGuestVisitorId(request);
  if (existing) {
    return { ok: true as const, visitorId: existing, cookieValue: null as string | null };
  }

  const visitorId = "gst_" + randomBytes(24).toString("base64url");
  return {
    ok: true as const,
    visitorId,
    cookieValue: createToken(visitorId, secret),
  };
}

export function setGuestCookie(response: NextResponse, cookieValue: string | null) {
  if (!cookieValue) return;

  response.cookies.set(cookieName, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}
