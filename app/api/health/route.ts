import { NextResponse } from "next/server";
import { getPublicHealth } from "@/lib/monitoring/service";

export async function GET() {
  const health = await getPublicHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
