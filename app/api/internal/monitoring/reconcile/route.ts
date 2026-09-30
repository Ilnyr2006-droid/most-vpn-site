import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runMonitoringCheck } from "@/lib/monitoring/service";

function authorized(request: Request) {
  const expected = process.env.MONITORING_CRON_SECRET;
  const received = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!expected || expected.length < 32 || !received) return false;
  const a = Buffer.from(received), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 401 });
  const result = await runMonitoringCheck();
  return NextResponse.json(result, { status: result.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
