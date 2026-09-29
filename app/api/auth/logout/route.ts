import { NextResponse } from "next/server";
import { authStore } from "@/lib/auth/repository";
import { cookieName, getAuthSession } from "@/lib/auth/session";
export async function POST() { const current = await getAuthSession(); if (current) await authStore.revoke(current.session.id); const response = NextResponse.json({ ok: true }); response.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 }); return response; }
