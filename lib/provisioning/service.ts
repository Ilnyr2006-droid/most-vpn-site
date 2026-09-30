import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getPostgresPool, hasDatabase } from "@/lib/db/postgres";
import { decryptProvisioningPayload, encryptProvisioningPayload } from "@/lib/provisioning/crypto";

type CommandPayload = { clientId: string; email: string };
type SubscriptionTokenPayload = { token: string };
type Endpoint = { port?: unknown; network?: unknown; serverName?: unknown; publicKey?: unknown; shortId?: unknown; flow?: unknown; path?: unknown };
export type NodeCommand = { id: string; kind: "PROVISION" | "REVOKE"; clientId: string; email: string };
export class ProvisioningError extends Error {}

function assertStorage() { if (!hasDatabase()) throw new ProvisioningError("VPN выдача требует PostgreSQL"); }
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function siteUrl() { const value = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""); if (value) return value; if (process.env.NODE_ENV === "production") throw new ProvisioningError("NEXT_PUBLIC_SITE_URL is required for VPN subscriptions"); return "http://localhost:3000"; }

function vless(payload: CommandPayload, domain: string, snapshot: unknown, deviceId: string) {
  const endpoints = Array.isArray(snapshot) ? snapshot as Endpoint[] : [];
  const endpoint = endpoints.find((value) => value.network === "tcp") ?? endpoints[0];
  if (!endpoint || typeof endpoint.port !== "number" || typeof endpoint.serverName !== "string" || typeof endpoint.publicKey !== "string" || typeof endpoint.shortId !== "string") return null;
  const params = new URLSearchParams({ encryption: "none", security: "reality", sni: endpoint.serverName, fp: "chrome", pbk: endpoint.publicKey, sid: endpoint.shortId, type: endpoint.network === "xhttp" ? "xhttp" : "tcp" });
  if (typeof endpoint.flow === "string" && endpoint.flow) params.set("flow", endpoint.flow);
  if (endpoint.network === "xhttp" && typeof endpoint.path === "string" && endpoint.path) params.set("path", endpoint.path);
  return `vless://${payload.clientId}@${domain}:${endpoint.port}?${params.toString()}#MOST-${encodeURIComponent(deviceId.slice(-8))}`;
}

async function command(client: import("pg").PoolClient, credential: { id: string; nodeId: string; payload: string }, kind: NodeCommand["kind"]) {
  const result = await client.query(`INSERT INTO vpn_node_commands(id,node_id,credential_id,kind,encrypted_payload,status) VALUES($1,$2,$3,$4,$5,'PENDING') ON CONFLICT (credential_id,kind) WHERE status='PENDING' DO NOTHING RETURNING id`, [`cmd_${randomUUID()}`, credential.nodeId, credential.id, kind, credential.payload]);
  return result.rowCount ?? 0;
}

export async function requestDeviceAccess(userId: string, input: { name: string; platform: string }) {
  assertStorage(); const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const subscription = await client.query<{ device_limit: number }>("SELECT device_limit FROM subscriptions WHERE user_id=$1 AND status='ACTIVE' AND ends_at>=CURRENT_DATE ORDER BY ends_at DESC LIMIT 1 FOR UPDATE", [userId]);
    if (!subscription.rows[0]) throw new ProvisioningError("Нужна активная подписка");
    const count = await client.query<{ count: string }>("SELECT count(*) FROM user_devices WHERE user_id=$1 AND revoked_at IS NULL", [userId]);
    if (Number(count.rows[0].count) >= subscription.rows[0].device_limit) throw new ProvisioningError("Достигнут лимит устройств");
    const nodes = await client.query<{ id: string }>("SELECT id FROM vpn_nodes WHERE published=TRUE AND status='ONLINE' AND last_seen_at>NOW()-INTERVAL '2 minutes' ORDER BY created_at FOR UPDATE SKIP LOCKED");
    if (!nodes.rowCount) throw new ProvisioningError("Нет доступной VPN-ноды для выдачи доступа");
    const deviceId = `dev_${randomUUID()}`, email = `most-${deviceId.slice(-12)}`, token = randomBytes(32).toString("base64url");
    await client.query("INSERT INTO user_devices(id,user_id,name,platform,status,added_at) VALUES($1,$2,$3,$4,'DISCONNECTED',NOW())", [deviceId, userId, input.name, input.platform]);
    await client.query("INSERT INTO device_subscription_tokens(id,device_id,token_hash,encrypted_token) VALUES($1,$2,$3,$4)", [`sub_${randomUUID()}`, deviceId, hash(token), encryptProvisioningPayload({ token } satisfies SubscriptionTokenPayload)]);
    for (const node of nodes.rows) {
      const payload = encryptProvisioningPayload({ clientId: randomUUID(), email } satisfies CommandPayload), parsed = decryptProvisioningPayload<CommandPayload>(payload), credential = { id: `cred_${randomUUID()}`, nodeId: node.id, payload };
      await client.query("INSERT INTO device_access_credentials(id,device_id,encrypted_payload,node_id,client_id,status,updated_at) VALUES($1,$2,$3,$4,$5,'PENDING',NOW())", [credential.id, deviceId, payload, node.id, parsed.clientId]);
      await command(client, credential, "PROVISION");
    }
    await client.query("COMMIT"); return { deviceId, status: "PENDING" as const };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function syncPublishedNodeClients(nodeId: string) {
  if (!hasDatabase()) { if (process.env.NODE_ENV === "production") assertStorage(); return 0; }
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const node = await client.query("SELECT id FROM vpn_nodes WHERE id=$1 AND published=TRUE AND status='ONLINE' AND last_seen_at>NOW()-INTERVAL '2 minutes' FOR UPDATE", [nodeId]);
    if (!node.rowCount) { await client.query("COMMIT"); return 0; }
    const devices = await client.query<{ id: string }>(`SELECT d.id FROM user_devices d WHERE d.revoked_at IS NULL AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id=d.user_id AND s.status='ACTIVE' AND s.ends_at>=CURRENT_DATE) FOR UPDATE`);
    let queued = 0;
    for (const device of devices.rows) {
      const payload = encryptProvisioningPayload({ clientId: randomUUID(), email: `most-${device.id.slice(-12)}` } satisfies CommandPayload), parsed = decryptProvisioningPayload<CommandPayload>(payload), credential = { id: `cred_${randomUUID()}`, nodeId, payload };
      const inserted = await client.query("INSERT INTO device_access_credentials(id,device_id,encrypted_payload,node_id,client_id,status,updated_at) VALUES($1,$2,$3,$4,$5,'PENDING',NOW()) ON CONFLICT (device_id,node_id) WHERE revoked_at IS NULL DO NOTHING RETURNING id", [credential.id, device.id, payload, nodeId, parsed.clientId]);
      if (inserted.rowCount) queued += await command(client, credential, "PROVISION");
    }
    await client.query("COMMIT"); return queued;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function nextNodeCommand(agentTokenHash: string): Promise<NodeCommand | null> {
  assertStorage(); const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string; kind: NodeCommand["kind"]; encrypted_payload: string }>(`WITH candidate AS (SELECT c.id FROM vpn_node_commands c JOIN vpn_nodes n ON n.id=c.node_id WHERE n.agent_token_hash=$1 AND c.status='PENDING' AND (c.last_dispatched_at IS NULL OR c.last_dispatched_at<NOW()-INTERVAL '45 seconds') ORDER BY c.created_at FOR UPDATE OF c SKIP LOCKED LIMIT 1) UPDATE vpn_node_commands c SET attempts=c.attempts+1,last_dispatched_at=NOW() FROM candidate WHERE c.id=candidate.id RETURNING c.id,c.kind,c.encrypted_payload`, [agentTokenHash]);
    await client.query("COMMIT"); if (!result.rows[0]) return null;
    return { id: result.rows[0].id, kind: result.rows[0].kind, ...decryptProvisioningPayload<CommandPayload>(result.rows[0].encrypted_payload) };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function completeNodeCommand(agentTokenHash: string, commandId: string, success: boolean, errorMessage?: string) {
  assertStorage(); const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ credential_id: string; kind: NodeCommand["kind"]; attempts: number }>(`UPDATE vpn_node_commands c SET status=CASE WHEN $3 THEN 'DONE' WHEN c.attempts>=5 THEN 'FAILED' ELSE 'PENDING' END,completed_at=CASE WHEN $3 OR c.attempts>=5 THEN NOW() ELSE NULL END,error_message=$4 FROM vpn_nodes n WHERE c.id=$2 AND n.id=c.node_id AND n.agent_token_hash=$1 AND c.status='PENDING' RETURNING c.credential_id,c.kind,c.attempts`, [agentTokenHash, commandId, success, errorMessage?.slice(0, 500) ?? null]);
    if (!result.rows[0]) throw new ProvisioningError("Команда не найдена"); const current = result.rows[0];
    if (success) {
      const status = current.kind === "PROVISION" ? "ACTIVE" : "REVOKED";
      await client.query("UPDATE device_access_credentials SET status=$2,updated_at=NOW(),error_message=NULL,revoked_at=CASE WHEN $2='REVOKED' THEN NOW() ELSE revoked_at END WHERE id=$1", [current.credential_id, status]);
      if (current.kind === "PROVISION") await client.query("UPDATE user_devices SET status='CONNECTED' WHERE id=(SELECT device_id FROM device_access_credentials WHERE id=$1)", [current.credential_id]);
      if (current.kind === "REVOKE") await client.query(`UPDATE user_devices d SET status='DISCONNECTED',revoked_at=NOW() WHERE d.id=(SELECT device_id FROM device_access_credentials WHERE id=$1) AND NOT EXISTS (SELECT 1 FROM device_access_credentials c WHERE c.device_id=d.id AND c.revoked_at IS NULL)`, [current.credential_id]);
    } else if (current.attempts >= 5) await client.query("UPDATE device_access_credentials SET status='ERROR',updated_at=NOW(),error_message=$2 WHERE id=$1", [current.credential_id, errorMessage?.slice(0, 500) ?? "Команда не выполнена"]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function queue(client: import("pg").PoolClient, condition: string, values: unknown[]) {
  const selected = await client.query<{ id: string; node_id: string; encrypted_payload: string }>(`SELECT id,node_id,encrypted_payload FROM device_access_credentials WHERE ${condition} FOR UPDATE`, values); let queued = 0;
  for (const row of selected.rows) { await client.query("UPDATE device_access_credentials SET status='REVOKE_PENDING',updated_at=NOW(),error_message=NULL WHERE id=$1", [row.id]); queued += await command(client, { id: row.id, nodeId: row.node_id, payload: row.encrypted_payload }, "REVOKE"); }
  return queued;
}

export async function queueExpiredAccessRevocations() { assertStorage(); const client = await getPostgresPool().connect(); try { await client.query("BEGIN"); const queued = await queue(client, `status IN ('ACTIVE','PENDING','ERROR') AND EXISTS (SELECT 1 FROM user_devices d WHERE d.id=device_access_credentials.device_id AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id=d.user_id AND s.status='ACTIVE' AND s.ends_at>=CURRENT_DATE))`, []); await client.query("COMMIT"); return queued; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } }
export async function queueNodeDrainRevocations(nodeId: string) { if (!hasDatabase()) { if (process.env.NODE_ENV === "production") assertStorage(); return 0; } const client = await getPostgresPool().connect(); try { await client.query("BEGIN"); const queued = await queue(client, "node_id=$1 AND status IN ('ACTIVE','PENDING','ERROR')", [nodeId]); await client.query("COMMIT"); return queued; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } }
export async function requestDeviceRevoke(userId: string, deviceId: string) { assertStorage(); const client = await getPostgresPool().connect(); try { await client.query("BEGIN"); const queued = await queue(client, `device_id=$1 AND status IN ('ACTIVE','ERROR') AND EXISTS (SELECT 1 FROM user_devices d WHERE d.id=device_access_credentials.device_id AND d.user_id=$2 AND d.revoked_at IS NULL)`, [deviceId, userId]); if (!queued) throw new ProvisioningError("Активный доступ для устройства не найден"); await client.query("UPDATE device_subscription_tokens SET revoked_at=NOW() WHERE device_id=$1 AND revoked_at IS NULL", [deviceId]); await client.query("COMMIT"); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } }

export async function getDeviceSubscriptionUrl(userId: string, deviceId: string) { assertStorage(); const result = await getPostgresPool().query<{ encrypted_token: string }>(`SELECT t.encrypted_token FROM device_subscription_tokens t JOIN user_devices d ON d.id=t.device_id WHERE d.id=$1 AND d.user_id=$2 AND d.revoked_at IS NULL AND t.revoked_at IS NULL LIMIT 1`, [deviceId, userId]); if (!result.rows[0]) throw new ProvisioningError("Доступ для устройства ещё не готов"); return `${siteUrl()}/api/subscription/${decryptProvisioningPayload<SubscriptionTokenPayload>(result.rows[0].encrypted_token).token}`; }
export async function getSubscriptionConfigs(token: string) { assertStorage(); const result = await getPostgresPool().query<{ device_id: string; encrypted_payload: string; domain: string; endpoint_snapshot: unknown }>(`SELECT d.id AS device_id,c.encrypted_payload,n.domain,n.endpoint_snapshot FROM device_subscription_tokens t JOIN user_devices d ON d.id=t.device_id JOIN device_access_credentials c ON c.device_id=d.id JOIN vpn_nodes n ON n.id=c.node_id WHERE t.token_hash=$1 AND t.revoked_at IS NULL AND d.revoked_at IS NULL AND c.status='ACTIVE' AND n.published=TRUE ORDER BY n.created_at,c.created_at`, [hash(token)]); return result.rows.map((row) => vless(decryptProvisioningPayload<CommandPayload>(row.encrypted_payload), row.domain, row.endpoint_snapshot, row.device_id)).filter((value): value is string => Boolean(value)); }
export async function getDeviceManualConfig(userId: string, deviceId: string) { assertStorage(); const result = await getPostgresPool().query<{ encrypted_payload: string; domain: string; endpoint_snapshot: unknown }>(`SELECT c.encrypted_payload,n.domain,n.endpoint_snapshot FROM device_access_credentials c JOIN user_devices d ON d.id=c.device_id JOIN vpn_nodes n ON n.id=c.node_id WHERE d.id=$1 AND d.user_id=$2 AND d.revoked_at IS NULL AND c.status='ACTIVE' AND n.published=TRUE ORDER BY n.created_at LIMIT 1`, [deviceId, userId]); if (!result.rows[0]) throw new ProvisioningError("Доступ для устройства ещё не готов"); const config = vless(decryptProvisioningPayload<CommandPayload>(result.rows[0].encrypted_payload), result.rows[0].domain, result.rows[0].endpoint_snapshot, deviceId); if (!config) throw new ProvisioningError("Нода не передала параметры подключения"); return config; }
