import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { nextNodeCommand } from "@/lib/provisioning/service";

function agentTokenHash(request: Request) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
  return match ? createHash("sha256").update(match[1]).digest("hex") : null;
}

export async function GET(request: Request) {
  const tokenHash = agentTokenHash(request);
  if (!tokenHash) return NextResponse.json({ error: "Недействительный токен агента" }, { status: 401 });
  const command = await nextNodeCommand(tokenHash);
  return NextResponse.json({ command }, { headers: { "Cache-Control": "no-store" } });
}
