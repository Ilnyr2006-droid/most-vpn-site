import { NextResponse } from "next/server";
import { readJsonBodyLimited } from "@/lib/support/security";
import { recordVpnNodeHeartbeat } from "@/lib/vpn-nodes/repository";
import type { VpnNodeEndpoint, VpnNodeHealthReport } from "@/lib/vpn-nodes/types";

function validEndpoint(value: unknown): value is VpnNodeEndpoint {
  if (!value || typeof value !== "object") return false;
  const endpoint = value as Partial<VpnNodeEndpoint>;
  return Number.isInteger(endpoint.port) && Number(endpoint.port) >= 1 && Number(endpoint.port) <= 65535 &&
    (endpoint.network === "tcp" || endpoint.network === "xhttp") &&
    typeof endpoint.serverName === "string" && endpoint.serverName.length >= 1 && endpoint.serverName.length <= 253 &&
    typeof endpoint.publicKey === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(endpoint.publicKey) &&
    typeof endpoint.shortId === "string" && /^(?:[a-fA-F0-9]{2}){1,8}$/.test(endpoint.shortId) &&
    typeof endpoint.flow === "string" && endpoint.flow.length <= 40 &&
    typeof endpoint.path === "string" && endpoint.path.length <= 200;
}

function validReport(value: unknown): value is VpnNodeHealthReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<VpnNodeHealthReport>;
  return typeof report.hostname === "string" && report.hostname.length >= 1 && report.hostname.length <= 253 &&
    typeof report.agentVersion === "string" && /^[0-9A-Za-z._-]{1,40}$/.test(report.agentVersion) &&
    typeof report.xrayActive === "boolean" && typeof report.configValid === "boolean" &&
    Array.isArray(report.endpoints) && report.endpoints.length <= 8 && report.endpoints.every(validEndpoint);
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? "");
  if (!match) return NextResponse.json({ error: "Недействительный токен агента" }, { status: 401 });

  const parsed = await readJsonBodyLimited<unknown>(request, 32 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!validReport(parsed.value)) return NextResponse.json({ error: "Некорректный отчёт ноды" }, { status: 400 });

  const node = await recordVpnNodeHeartbeat(match[1], parsed.value);
  if (!node) return NextResponse.json({ error: "Нода не зарегистрирована" }, { status: 401 });
  return NextResponse.json({ ok: true, status: node.status }, { headers: { "Cache-Control": "no-store" } });
}
