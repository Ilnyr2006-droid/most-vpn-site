import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { DevProvisioningError, getDevVpnNodeStatus } from "@/lib/provisioning/dev-ssh";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const current = await getAuthSession();
  if (!current) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const nodes = await getDevVpnNodeStatus();
    return NextResponse.json({ nodes });
  } catch (error) {
    const message = error instanceof DevProvisioningError ? error.message : "Development VPN node is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
