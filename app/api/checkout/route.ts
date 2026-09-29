import { NextResponse } from "next/server";
import { createPayment, PaymentNotConfiguredError } from "@/lib/payment";
import { isPlanId } from "@/lib/plans";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (!isPlanId(data.planId) || typeof data.email !== "string" || !emailPattern.test(data.email)) {
    return NextResponse.json({ error: "Проверьте тариф и email" }, { status: 400 });
  }
  if (data.accepted !== true) {
    return NextResponse.json({ error: "Нужно принять условия сервиса" }, { status: 400 });
  }

  try {
    const payment = await createPayment({
      planId: data.planId,
      email: data.email.trim().toLowerCase(),
      contact: typeof data.contact === "string" ? data.contact.trim() : undefined,
      idempotencyKey: crypto.randomUUID(),
    });
    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof PaymentNotConfiguredError) {
      return NextResponse.json({ error: "Оплата пока недоступна. Мы готовим запуск." }, { status: 503 });
    }
    return NextResponse.json({ error: "Не удалось создать платёж. Попробуйте позже." }, { status: 500 });
  }
}
