import { NextResponse } from "next/server";
import type { ServiceStatus } from "@/lib/models";
const services: { name: string; status: ServiceStatus }[] = [{ name: "Germany", status: "ONLINE" }, { name: "Poland", status: "ONLINE" }, { name: "Netherlands", status: "ONLINE" }, { name: "Payments", status: "OFFLINE" }];
export async function GET() { return NextResponse.json({ updatedAt: new Date().toISOString(), services }); }
