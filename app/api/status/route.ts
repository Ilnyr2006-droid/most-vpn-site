import { NextResponse } from "next/server";
import type { ServiceStatus } from "@/lib/models";
const services: { name: string; status: ServiceStatus }[] = [{ name: "Germany", status: "NOT_STARTED" }, { name: "Poland", status: "NOT_STARTED" }, { name: "Netherlands", status: "NOT_STARTED" }, { name: "Payments", status: "NOT_STARTED" }];
export async function GET() { return NextResponse.json({ updatedAt: new Date().toISOString(), services }); }
