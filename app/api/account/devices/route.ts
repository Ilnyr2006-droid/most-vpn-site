import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { requestDeviceAccess, ProvisioningError } from "@/lib/provisioning/service";
import type { Platform } from "@/lib/models";

const platforms = new Set<Platform>(["iOS", "Android", "Windows", "macOS", "Linux"]);

export async function POST(request: Request) {
  const current = await getAuthSession();
  if (!current) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  let body: { name?: unknown; platform?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 120 || !platforms.has(body.platform as Platform)) {
    return NextResponse.json({ error: "Проверьте название и тип устройства" }, { status: 400 });
  }
  try {
    const result = await requestDeviceAccess(current.user.id, { name: body.name.trim(), platform: body.platform as Platform });
    return NextResponse.json(result, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProvisioningError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
