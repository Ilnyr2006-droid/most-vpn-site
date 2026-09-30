import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { readJsonBodyLimited } from "@/lib/support/security";
import { createRegisteredVpnNode, listRegisteredVpnNodes } from "@/lib/vpn-nodes/repository";

function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 80 && !/[\u0000-\u001f]/.test(value);
}

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  return NextResponse.json({ nodes: await listRegisteredVpnNodes() });
}

export async function POST(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  const body = await readJsonBodyLimited<{ name?: unknown }>(request, 1024);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  if (!validName(body.value.name)) return NextResponse.json({ error: "Введите название от 2 до 80 символов" }, { status: 400 });
  const node = await createRegisteredVpnNode(body.value.name.trim());
  return NextResponse.json({ node }, { status: 201 });
}
