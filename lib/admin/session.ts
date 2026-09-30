import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const cookieName = "most_admin_session";
const maxAge = 60 * 60 * 12;
const minSecretLength = 32;

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < minSecretLength) return null;
  return secret;
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function adminCredentialsConfigured() {
  return Boolean(
    process.env.ADMIN_USERNAME?.trim() &&
    process.env.ADMIN_PASSWORD?.trim() &&
    getSecret()
  );
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME?.trim();
  const expectedPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!expectedUsername || !expectedPassword || !getSecret()) return false;

  const a = Buffer.from(username);
  const b = Buffer.from(expectedUsername);
  const c = Buffer.from(password);
  const d = Buffer.from(expectedPassword);

  if (a.length !== b.length || c.length !== d.length) return false;
  return timingSafeEqual(a, b) && timingSafeEqual(c, d);
}

export async function createAdminSession(username: string) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET must be set and contain at least 32 characters");
  }

  const issuedAt = Date.now();
  const payload = Buffer.from(JSON.stringify({ username, issuedAt })).toString("base64url");
  const token = payload + "." + sign(payload, secret);

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearAdminSession() {
  (await cookies()).set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const secret = getSecret();
  if (!secret) return null;

  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      username?: string;
      issuedAt?: number;
    };

    const expectedUsername = process.env.ADMIN_USERNAME?.trim();
    if (!parsed.username || !parsed.issuedAt || !expectedUsername) return null;
    if (parsed.username !== expectedUsername) return null;
    if (Date.now() - parsed.issuedAt > maxAge * 1000) return null;

    return { username: parsed.username };
  } catch {
    return null;
  }
}
