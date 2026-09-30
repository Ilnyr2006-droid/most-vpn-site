import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { requestDeviceRevoke, ProvisioningError } from "@/lib/provisioning/service";

const deviceIdPattern = /^dev_[0-9a-f-]{36}$/i;

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await getAuthSession();
  if (!current) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  const { id } = await context.params;
  if (!deviceIdPattern.test(id)) return NextResponse.json({ error: "Некорректное устройство" }, { status: 400 });
  try {
    await requestDeviceRevoke(current.user.id, id);
    return NextResponse.json({ ok: true, status: "REVOKE_PENDING" }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProvisioningError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
