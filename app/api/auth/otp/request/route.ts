import { NextResponse } from "next/server";
import { requestVerification } from "@/lib/auth/service";
import { createSession, sessionCookie } from "@/lib/auth/session";
import { getRequestIp } from "@/lib/security/request-ip";
export async function POST(request: Request) { try { const body = await request.json() as { phone?: unknown }; if (typeof body.phone !== "string") throw new Error("Введите номер телефона"); const result = await requestVerification(body.phone, getRequestIp(request)); if (result.kind === "authenticated") { const { token } = await createSession(result.user); const response = NextResponse.json({ ok: true, phone: result.phone }); const cookie = sessionCookie(token); response.cookies.set(cookie.name, cookie.value, cookie.options); return response; } return NextResponse.json(result, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось отправить код" }, { status: 400 }); } }
