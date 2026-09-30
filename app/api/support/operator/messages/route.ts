import { NextResponse } from "next/server";
import { getSupportOperator } from "@/lib/support/access";
import { addMessage, getConversation } from "@/lib/support/repository";

export async function POST(request: Request) {
  const operator = await getSupportOperator();
  if (!operator) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";

  if (!conversationId || !text) {
    return NextResponse.json({ error: "Сообщение пустое" }, { status: 400 });
  }

  if (!await getConversation(conversationId)) {
    return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  }

  const message = await addMessage({
    conversationId,
    sender: "operator",
    text,
  });

  return NextResponse.json({ message });
}
