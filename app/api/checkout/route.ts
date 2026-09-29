import { NextResponse } from "next/server";
import { PaymentNotConfiguredError, createPayment } from "@/lib/payment";
import { isPlanId, plans } from "@/lib/plans";
import { createDraftOrder } from "@/lib/mock-service";
import { getAuthSession } from "@/lib/auth/session";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function POST(request: Request) { let data: { planId?: unknown; email?: unknown; contact?: unknown; accepted?: unknown; orderId?: unknown }; try { data = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const current = await getAuthSession();
  if (!current) return NextResponse.json({ error: "Войдите в аккаунт, чтобы продолжить" }, { status: 401 });
  if (!isPlanId(data.planId) || typeof data.email === "string" && data.email.length > 0 && !emailPattern.test(data.email) || data.accepted !== true) return NextResponse.json({ error: "Проверьте тариф, email и условия сервиса" }, { status: 400 });
  if (typeof data.orderId !== "string" || !/^[a-zA-Z0-9_-]{12,80}$/.test(data.orderId)) return NextResponse.json({ error: "Не удалось создать заказ" }, { status: 400 });
  const plan = plans[data.planId]; const order = createDraftOrder(plan.id, plan.price, data.orderId, current.user.id);
  try { const payment = await createPayment({ order, email: typeof data.email === "string" && data.email ? data.email.trim().toLowerCase() : undefined, contact: typeof data.contact === "string" ? data.contact.trim() : undefined }); return NextResponse.json({ orderId: order.id, confirmationUrl: payment.confirmationUrl }); }
  catch (error) { if (error instanceof PaymentNotConfiguredError) return NextResponse.json({ error: "Оплата пока недоступна. Мы готовим запуск." }, { status: 503 }); return NextResponse.json({ error: "Не удалось создать платёж. Попробуйте позже." }, { status: 500 }); }
}
