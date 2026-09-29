import { NextResponse } from "next/server";

export async function POST() {
  // Здесь должна быть проверка подписи webhook, повторный запрос статуса платежа
  // у провайдера и только затем идемпотентная выдача доступа.
  return NextResponse.json({ error: "Платёжный провайдер не настроен" }, { status: 503 });
}
