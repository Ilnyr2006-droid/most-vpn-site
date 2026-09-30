import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { readJsonBodyLimited } from "@/lib/support/security";
import { createRegisteredVpnNode, listRegisteredVpnNodes } from "@/lib/vpn-nodes/repository";
import { createBootstrapCommand } from "@/lib/vpn-nodes/bootstrap";

function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 80 && !/[\u0000-\u001f]/.test(value);
}

function validCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value.trim());
}

function validDomain(value: unknown): value is string {
  return typeof value === "string" && value.length <= 253 && /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(value.trim());
}

function getControlUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const url = new URL(configured || request.url);
  if (url.protocol !== "https:") {
    throw new Error("Для подключения VPN-ноды задайте публичный HTTPS-адрес в NEXT_PUBLIC_SITE_URL");
  }
  return url.origin;
}

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  return NextResponse.json({ nodes: await listRegisteredVpnNodes() });
}

export async function POST(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  const body = await readJsonBodyLimited<{ name?: unknown; countryCode?: unknown; domain?: unknown }>(request, 2048);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  if (!validName(body.value.name)) return NextResponse.json({ error: "Введите название от 2 до 80 символов" }, { status: 400 });
  if (!validCountryCode(body.value.countryCode)) return NextResponse.json({ error: "Укажите двухбуквенный код страны" }, { status: 400 });
  if (!validDomain(body.value.domain)) return NextResponse.json({ error: "Укажите корректный домен VPN-сервера" }, { status: 400 });
  let controlUrl: string;
  try {
    controlUrl = getControlUrl(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не настроен адрес MOST" }, { status: 503 });
  }
  const result = await createRegisteredVpnNode({
    name: body.value.name.trim(),
    countryCode: body.value.countryCode.trim().toUpperCase(),
    domain: body.value.domain.trim().toLowerCase(),
  });
  const bootstrapCommand = await createBootstrapCommand(controlUrl, result.enrollmentToken);
  return NextResponse.json({ node: result.node, bootstrapCommand, enrollmentExpiresAt: result.node.enrollmentExpiresAt }, { status: 201 });
}
