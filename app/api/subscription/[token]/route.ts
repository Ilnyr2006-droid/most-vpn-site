import { NextResponse } from "next/server";
import { getSubscriptionConfigs, ProvisioningError } from "@/lib/provisioning/service";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!tokenPattern.test(token)) return new NextResponse("Not found", { status: 404 });
  try {
    const configs = await getSubscriptionConfigs(token);
    if (!configs.length) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(`${configs.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof ProvisioningError) return new NextResponse("Not found", { status: 404 });
    throw error;
  }
}
