import { NextResponse } from "next/server";
import { PaymentNotConfiguredError, createPayment } from "@/lib/payment";
import { isPlanId, plans } from "@/lib/plans";
import { createDraftOrder } from "@/lib/mock-service";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function POST(request: Request) { let data: { planId?: unknown; email?: unknown; contact?: unknown; accepted?: unknown; orderId?: unknown }; try { data = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  if (!isPlanId(data.planId) || typeof data.email !== "string" || !emailPattern.test(data.email) || data.accepted !== true) return NextResponse.json({ error: "Проверьте тариф, email и условия сервиса" }, { status: 400 });
  if (typeof data.orderId !== "string" || !/^[a-zA-Z0-9_-]{12,80}$/.test(data.orderId)) return NextResponse.json({ error: "Не удалось создать заказ" }, { status: 400 });
  const plan = plans[data.planId]; const order = createDraftOrder(plan.id, plan.price, data.orderId);
  try { const payment = await createPayment({ order, email: data.email.trim().toLowerCase(), contact: typeof data.contact === "string" ? data.contact.trim() : undefined }); return NextResponse.json({ orderId: order.id, confirmationUrl: payment.confirmationUrl }); }
  catch (error) { if (error instanceof PaymentNotConfiguredError) return NextResponse.json({ error: "Оплата пока недоступна. Мы готовим запуск." }, { status: 503 }); return NextResponse.json({ error: "Не удалось создать платёж. Попробуйте позже." }, { status: 500 }); }
}
