import { NextResponse } from "next/server";
import { requestVerification } from "@/lib/auth/service";
export async function POST(request: Request) { try { const body = await request.json() as { phone?: unknown }; if (typeof body.phone !== "string") throw new Error("Введите номер телефона"); const result = await requestVerification(body.phone, request.headers.get("x-forwarded-for")); return NextResponse.json(result, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось отправить код" }, { status: 400 }); } }
