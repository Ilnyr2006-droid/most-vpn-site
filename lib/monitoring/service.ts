import { getPostgresPool, hasDatabase } from "@/lib/db/postgres";
import { listRegisteredVpnNodes, reconcileStaleVpnNodes } from "@/lib/vpn-nodes/repository";

type State = "UP" | "DOWN";
type Check = { key: string; label: string; state: State; detail?: string };
type AlertRow = { state: State };

declare global {
  // eslint-disable-next-line no-var
  var __mostMonitoringFallback: Map<string, State> | undefined;
}

const fallback = globalThis.__mostMonitoringFallback ?? new Map<string, State>();
globalThis.__mostMonitoringFallback = fallback;

async function sendAlert(check: Check) {
  const webhook = process.env.MONITORING_ALERT_WEBHOOK_URL?.trim();
  if (!webhook) return false;
  const text = check.state === "DOWN" ? `MOST: недоступен ${check.label}${check.detail ? ` — ${check.detail}` : ""}` : `MOST: восстановлен ${check.label}`;
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, service: check.key, state: check.state, detail: check.detail ?? null, at: new Date().toISOString() }),
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch { return false; }
}

async function publishTransition(check: Check) {
  if (!hasDatabase()) {
    const previous = fallback.get(check.key);
    fallback.set(check.key, check.state);
    if (previous !== check.state) await sendAlert(check);
    return;
  }
  try {
    const pool = getPostgresPool();
    const previous = await pool.query<AlertRow>("SELECT state FROM monitoring_alerts WHERE alert_key=$1", [check.key]);
    const changed = !previous.rows[0] || previous.rows[0].state !== check.state;
    await pool.query(
      `INSERT INTO monitoring_alerts(alert_key,state,updated_at,last_notified_at)
       VALUES($1,$2,NOW(),CASE WHEN $3 THEN NOW() ELSE NULL END)
       ON CONFLICT(alert_key) DO UPDATE SET state=EXCLUDED.state,updated_at=NOW(),last_notified_at=CASE WHEN $3 THEN NOW() ELSE monitoring_alerts.last_notified_at END`,
      [check.key, check.state, changed],
    );
    if (changed) await sendAlert(check);
  } catch {
    const previous = fallback.get(check.key);
    fallback.set(check.key, check.state);
    if (previous !== check.state) await sendAlert(check);
  }
}

export async function runMonitoringCheck() {
  const checks: Check[] = [];
  try {
    if (!hasDatabase()) throw new Error("DATABASE_URL is not configured");
    await getPostgresPool().query("SELECT 1");
    checks.push({ key: "database", label: "база данных", state: "UP" });
  } catch (error) {
    checks.push({ key: "database", label: "база данных", state: "DOWN", detail: error instanceof Error ? error.message.slice(0, 180) : "проверка не прошла" });
  }

  if (checks[0].state === "UP") {
    try {
      await reconcileStaleVpnNodes();
      const nodes = await listRegisteredVpnNodes();
      const published = nodes.filter((node) => node.published);
      checks.push({ key: "vpn", label: "VPN", state: published.some((node) => node.status === "ONLINE") ? "UP" : "DOWN", detail: published.length ? undefined : "нет опубликованных нод" });
      for (const node of published) checks.push({ key: `vpn:${node.id}`, label: `VPN-нода «${node.name}»`, state: node.status === "ONLINE" ? "UP" : "DOWN", detail: node.status === "ONLINE" ? undefined : `статус ${node.status}` });
    } catch (error) {
      checks.push({ key: "vpn", label: "VPN", state: "DOWN", detail: error instanceof Error ? error.message.slice(0, 180) : "проверка не прошла" });
    }
  }
  for (const check of checks) await publishTransition(check);
  return { ok: checks.every((check) => check.state === "UP"), checks };
}

export async function getPublicHealth() {
  try {
    if (!hasDatabase()) throw new Error("DATABASE_URL is not configured");
    await getPostgresPool().query("SELECT 1");
    return { ok: true as const };
  } catch { return { ok: false as const }; }
}
