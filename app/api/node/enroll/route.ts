import { NextResponse } from "next/server";
import { enforceRateLimits, RateLimitUnavailableError } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { readJsonBodyLimited } from "@/lib/support/security";
import { enrollVpnNode } from "@/lib/vpn-nodes/repository";

export async function POST(request: Request) {
  const parsed = await readJsonBodyLimited<{ token?: unknown }>(request, 2048);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (typeof parsed.value.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(parsed.value.token)) {
    return NextResponse.json({ error: "Недействительный токен подключения" }, { status: 400 });
  }

  try {
    const rate = await enforceRateLimits([{ key: `node:enroll:${getRequestIp(request)}:10m`, limit: 10, windowMs: 10 * 60_000 }]);
    if (!rate.ok) return NextResponse.json({ error: "Слишком много попыток подключения" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return NextResponse.json({ error: "Подключение нод временно недоступно" }, { status: 503 });
    throw error;
  }

  const result = await enrollVpnNode(parsed.value.token);
  if (!result) return NextResponse.json({ error: "Токен истёк или уже использован" }, { status: 401 });
  return NextResponse.json({ nodeId: result.node.id, agentToken: result.agentToken }, { headers: { "Cache-Control": "no-store" } });
}
