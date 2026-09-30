import { NextResponse } from "next/server";
import { getSupportOperator } from "@/lib/support/access";
import { listConversations } from "@/lib/support/repository";

export async function GET() {
  const operator = await getSupportOperator();
  if (!operator) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

  return NextResponse.json({ conversations: await listConversations() });
}
