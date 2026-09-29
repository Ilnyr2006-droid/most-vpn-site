import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
export async function GET() { const current = await getAuthSession(); return NextResponse.json({ user: current?.user ?? null }); }
