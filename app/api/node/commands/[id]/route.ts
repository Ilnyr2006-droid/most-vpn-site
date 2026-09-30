import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { completeNodeCommand, ProvisioningError } from "@/lib/provisioning/service";
import { readJsonBodyLimited } from "@/lib/support/security";

const commandIdPattern = /^cmd_[0-9a-f-]{36}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
  if (!token) return NextResponse.json({ error: "Недействительный токен агента" }, { status: 401 });
  const { id } = await context.params;
  if (!commandIdPattern.test(id)) return NextResponse.json({ error: "Некорректная команда" }, { status: 400 });
  const body = await readJsonBodyLimited<{ success?: unknown; error?: unknown }>(request, 2048);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  if (typeof body.value.success !== "boolean" || (body.value.error !== undefined && (typeof body.value.error !== "string" || body.value.error.length > 500))) return NextResponse.json({ error: "Некорректный результат команды" }, { status: 400 });
  try {
    await completeNodeCommand(createHash("sha256").update(token[1]).digest("hex"), id, body.value.success, body.value.error);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProvisioningError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
}
