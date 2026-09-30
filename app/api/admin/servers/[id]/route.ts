import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { deleteRegisteredVpnNode } from "@/lib/vpn-nodes/repository";

const nodeIdPattern = /^vpn_[0-9a-f-]{36}$/i;

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

  const { id } = await context.params;
  if (!nodeIdPattern.test(id)) return NextResponse.json({ error: "Некорректный идентификатор сервера" }, { status: 400 });

  const result = await deleteRegisteredVpnNode(id);
  if (result === "missing") return NextResponse.json({ error: "Сервер не найден" }, { status: 404 });
  if (result === "published") return NextResponse.json({ error: "Сначала выведите сервер из подписок" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
