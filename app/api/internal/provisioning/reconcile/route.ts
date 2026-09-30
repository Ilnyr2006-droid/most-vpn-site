import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { queueExpiredAccessRevocations } from "@/lib/provisioning/service";

function authorized(request: Request) {
  const expected = process.env.PROVISIONING_CRON_SECRET;
  const received = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!expected || expected.length < 32 || !received) return false;
  const a = Buffer.from(received); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 401 });
  const queued = await queueExpiredAccessRevocations();
  return NextResponse.json({ ok: true, queued }, { headers: { "Cache-Control": "no-store" } });
}
