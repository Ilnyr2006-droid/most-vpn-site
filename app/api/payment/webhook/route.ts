import { NextResponse } from "next/server";
import { PaymentNotConfiguredError, confirmPaymentWebhook } from "@/lib/payment";
export async function POST(request: Request) { try { const payload = await request.json(); await confirmPaymentWebhook(payload); return NextResponse.json({ ok: true }); } catch (error) { if (error instanceof PaymentNotConfiguredError) return NextResponse.json({ error: "Платёжный провайдер не настроен" }, { status: 503 }); return NextResponse.json({ error: "Некорректный webhook" }, { status: 400 }); } }
