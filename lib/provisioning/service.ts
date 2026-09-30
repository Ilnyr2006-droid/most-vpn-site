import { randomUUID } from "node:crypto";
import { getPostgresPool, hasDatabase } from "@/lib/db/postgres";
import { decryptProvisioningPayload, encryptProvisioningPayload } from "@/lib/provisioning/crypto";

type CommandPayload = { clientId: string; email: string };
export type NodeCommand = { id: string; kind: "PROVISION" | "REVOKE"; clientId: string; email: string };

export class ProvisioningError extends Error {}

function assertProvisioningStorage() {
  if (!hasDatabase()) throw new ProvisioningError("VPN выдача требует PostgreSQL");
}

export async function requestDeviceAccess(userId: string, input: { name: string; platform: string }) {
  assertProvisioningStorage();
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const subscription = await client.query<{ device_limit: number }>(
      "SELECT device_limit FROM subscriptions WHERE user_id=$1 AND status='ACTIVE' AND ends_at>=CURRENT_DATE ORDER BY ends_at DESC LIMIT 1 FOR UPDATE",
      [userId],
    );
    if (!subscription.rows[0]) throw new ProvisioningError("Нужна активная подписка");
    const activeDevices = await client.query<{ count: string }>("SELECT count(*) FROM user_devices WHERE user_id=$1 AND revoked_at IS NULL", [userId]);
    if (Number(activeDevices.rows[0].count) >= subscription.rows[0].device_limit) throw new ProvisioningError("Достигнут лимит устройств");
    const node = await client.query<{ id: string }>(
      "SELECT id FROM vpn_nodes WHERE published=TRUE AND status='ONLINE' AND last_seen_at>NOW()-INTERVAL '2 minutes' ORDER BY last_seen_at DESC LIMIT 1 FOR UPDATE SKIP LOCKED",
    );
    if (!node.rows[0]) throw new ProvisioningError("Нет доступной VPN-ноды для выдачи доступа");

    const deviceId = `dev_${randomUUID()}`;
    const credentialId = `cred_${randomUUID()}`;
    const commandId = `cmd_${randomUUID()}`;
    const clientId = randomUUID();
    const email = `most-${deviceId.slice(-12)}`;
    const payload = encryptProvisioningPayload({ clientId, email } satisfies CommandPayload);
    await client.query("INSERT INTO user_devices(id,user_id,name,platform,status,added_at) VALUES($1,$2,$3,$4,'DISCONNECTED',NOW())", [deviceId, userId, input.name, input.platform]);
    await client.query("INSERT INTO device_access_credentials(id,device_id,encrypted_payload,node_id,client_id,status,updated_at) VALUES($1,$2,$3,$4,$5,'PENDING',NOW())", [credentialId, deviceId, payload, node.rows[0].id, clientId]);
    await client.query("INSERT INTO vpn_node_commands(id,node_id,credential_id,kind,encrypted_payload,status) VALUES($1,$2,$3,'PROVISION',$4,'PENDING')", [commandId, node.rows[0].id, credentialId, payload]);
    await client.query("COMMIT");
    return { deviceId, status: "PENDING" as const };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function nextNodeCommand(agentTokenHash: string): Promise<NodeCommand | null> {
  assertProvisioningStorage();
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string; kind: NodeCommand["kind"]; encrypted_payload: string }>(
      `WITH candidate AS (
         SELECT c.id FROM vpn_node_commands c JOIN vpn_nodes n ON n.id=c.node_id
          WHERE n.agent_token_hash=$1 AND c.status='PENDING'
          ORDER BY c.created_at ASC FOR UPDATE OF c SKIP LOCKED LIMIT 1
       ) UPDATE vpn_node_commands c SET attempts=c.attempts+1,last_dispatched_at=NOW()
          FROM candidate WHERE c.id=candidate.id
          RETURNING c.id,c.kind,c.encrypted_payload`,
      [agentTokenHash],
    );
    await client.query("COMMIT");
    if (!result.rows[0]) return null;
    const payload = decryptProvisioningPayload<CommandPayload>(result.rows[0].encrypted_payload);
    return { id: result.rows[0].id, kind: result.rows[0].kind, ...payload };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeNodeCommand(agentTokenHash: string, commandId: string, success: boolean, errorMessage?: string) {
  assertProvisioningStorage();
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const command = await client.query<{ credential_id: string; kind: NodeCommand["kind"] }>(
      `UPDATE vpn_node_commands c SET status=$3, completed_at=NOW(), error_message=$4
         FROM vpn_nodes n WHERE c.id=$2 AND n.id=c.node_id AND n.agent_token_hash=$1 AND c.status='PENDING'
         RETURNING c.credential_id,c.kind`,
      [agentTokenHash, commandId, success ? "DONE" : "FAILED", errorMessage?.slice(0, 500) ?? null],
    );
    if (!command.rows[0]) throw new ProvisioningError("Команда не найдена");
    const nextStatus = success ? (command.rows[0].kind === "PROVISION" ? "ACTIVE" : "REVOKED") : "ERROR";
    await client.query("UPDATE device_access_credentials SET status=$2,updated_at=NOW(),error_message=$3,revoked_at=CASE WHEN $2='REVOKED' THEN NOW() ELSE revoked_at END WHERE id=$1", [command.rows[0].credential_id, nextStatus, errorMessage?.slice(0, 500) ?? null]);
    if (success && command.rows[0].kind === "REVOKE") await client.query("UPDATE user_devices SET status='DISCONNECTED',revoked_at=NOW() WHERE id=(SELECT device_id FROM device_access_credentials WHERE id=$1)", [command.rows[0].credential_id]);
    if (success && command.rows[0].kind === "PROVISION") await client.query("UPDATE user_devices SET status='CONNECTED' WHERE id=(SELECT device_id FROM device_access_credentials WHERE id=$1)", [command.rows[0].credential_id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function queueExpiredAccessRevocations() {
  assertProvisioningStorage();
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const expired = await client.query<{ id: string; node_id: string; encrypted_payload: string }>(
      `SELECT c.id,c.node_id,c.encrypted_payload FROM device_access_credentials c
       JOIN user_devices d ON d.id=c.device_id
       WHERE c.status='ACTIVE' AND NOT EXISTS (
         SELECT 1 FROM subscriptions s WHERE s.user_id=d.user_id AND s.status='ACTIVE' AND s.ends_at>=CURRENT_DATE
       ) FOR UPDATE OF c SKIP LOCKED`,
    );
    for (const credential of expired.rows) {
      await client.query("INSERT INTO vpn_node_commands(id,node_id,credential_id,kind,encrypted_payload,status) VALUES($1,$2,$3,'REVOKE',$4,'PENDING')", [`cmd_${randomUUID()}`, credential.node_id, credential.id, credential.encrypted_payload]);
      await client.query("UPDATE device_access_credentials SET status='REVOKE_PENDING',updated_at=NOW() WHERE id=$1", [credential.id]);
    }
    await client.query("COMMIT");
    return expired.rowCount ?? 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function requestDeviceRevoke(userId: string, deviceId: string) {
  assertProvisioningStorage();
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const credential = await client.query<{ id: string; node_id: string; encrypted_payload: string }>(
      `SELECT c.id,c.node_id,c.encrypted_payload FROM device_access_credentials c
       JOIN user_devices d ON d.id=c.device_id
       WHERE d.id=$1 AND d.user_id=$2 AND d.revoked_at IS NULL AND c.status IN ('ACTIVE','ERROR')
       FOR UPDATE OF c`,
      [deviceId, userId],
    );
    if (!credential.rows[0]) throw new ProvisioningError("Активный доступ для устройства не найден");
    await client.query("UPDATE device_access_credentials SET status='REVOKE_PENDING',updated_at=NOW(),error_message=NULL WHERE id=$1", [credential.rows[0].id]);
    await client.query("INSERT INTO vpn_node_commands(id,node_id,credential_id,kind,encrypted_payload,status) VALUES($1,$2,$3,'REVOKE',$4,'PENDING')", [`cmd_${randomUUID()}`, credential.rows[0].node_id, credential.rows[0].id, credential.rows[0].encrypted_payload]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getDeviceManualConfig(userId: string, deviceId: string) {
  assertProvisioningStorage();
  const result = await getPostgresPool().query<{ encrypted_payload: string; domain: string; endpoint_snapshot: unknown }>(
    `SELECT c.encrypted_payload,n.domain,n.endpoint_snapshot FROM device_access_credentials c
     JOIN user_devices d ON d.id=c.device_id
     JOIN vpn_nodes n ON n.id=c.node_id
     WHERE d.id=$1 AND d.user_id=$2 AND d.revoked_at IS NULL AND c.status='ACTIVE' LIMIT 1`,
    [deviceId, userId],
  );
  if (!result.rows[0]) throw new ProvisioningError("Доступ для устройства ещё не готов");
  const payload = decryptProvisioningPayload<CommandPayload>(result.rows[0].encrypted_payload);
  const endpoints = Array.isArray(result.rows[0].endpoint_snapshot) ? result.rows[0].endpoint_snapshot as Array<{ port?: unknown; network?: unknown; serverName?: unknown; publicKey?: unknown; shortId?: unknown; flow?: unknown; path?: unknown }> : [];
  const endpoint = endpoints.find((value) => value.network === "tcp") ?? endpoints[0];
  if (!endpoint || typeof endpoint.port !== "number" || typeof endpoint.serverName !== "string" || typeof endpoint.publicKey !== "string" || typeof endpoint.shortId !== "string") throw new ProvisioningError("Нода не передала параметры подключения");
  const parameters = new URLSearchParams({ encryption: "none", security: "reality", sni: endpoint.serverName, fp: "chrome", pbk: endpoint.publicKey, sid: endpoint.shortId, type: endpoint.network === "xhttp" ? "xhttp" : "tcp" });
  if (typeof endpoint.flow === "string" && endpoint.flow) parameters.set("flow", endpoint.flow);
  if (endpoint.network === "xhttp" && typeof endpoint.path === "string" && endpoint.path) parameters.set("path", endpoint.path);
  return `vless://${payload.clientId}@${result.rows[0].domain}:${endpoint.port}?${parameters.toString()}#MOST-${encodeURIComponent(deviceId.slice(-8))}`;
}
