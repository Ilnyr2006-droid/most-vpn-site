import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeIp(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return null;
  return trimmed;
}

export function getRequestIp(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return "local-dev";
  }

  const proxySecret = process.env.TRUSTED_PROXY_HEADER_SECRET?.trim();
  if (!proxySecret) {
    return "untrusted-proxy";
  }

  const secretHeaderName =
    process.env.TRUSTED_PROXY_SECRET_HEADER?.trim().toLowerCase() ||
    "x-most-proxy-secret";
  const suppliedSecret = request.headers.get(secretHeaderName);

  if (!suppliedSecret || !safeEqual(suppliedSecret, proxySecret)) {
    return "untrusted-proxy";
  }

  const cf = normalizeIp(request.headers.get("cf-connecting-ip"));
  if (cf) return cf;

  const real = normalizeIp(request.headers.get("x-real-ip"));
  if (real) return real;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = normalizeIp(forwarded.split(",")[0] ?? null);
    if (first) return first;
  }

  return "trusted-proxy-unknown-ip";
}
