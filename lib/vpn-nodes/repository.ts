import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasDatabase, getPostgresPool } from "@/lib/db/postgres";
import type { RegisteredVpnNode, VpnNodeEndpoint, VpnNodeHealthReport, VpnNodeStatus } from "@/lib/vpn-nodes/types";

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "vpn-nodes.json");
const enrollmentLifetimeMs = 30 * 60_000;
let localMutation = Promise.resolve();

function staleAfterMs() {
  const seconds = Number(process.env.VPN_HEARTBEAT_STALE_SECONDS ?? "150");
  return (Number.isFinite(seconds) && seconds >= 60 && seconds <= 900 ? seconds : 150) * 1_000;
}

type StoredVpnNode = RegisteredVpnNode & {
  enrollmentTokenHash: string | null;
  agentTokenHash: string | null;
  enrolledAt: string | null;
};

type NodeRow = {
  id: string;
  name: string;
  country_code: string;
  domain: string;
  status: VpnNodeStatus;
  published: boolean;
  agent_version: string | null;
  last_seen_at: Date | string | null;
  endpoint_snapshot: VpnNodeEndpoint[] | string | null;
  enrollment_expires_at: Date | string | null;
  created_at: Date | string;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function parseEndpoints(value: NodeRow["endpoint_snapshot"]): VpnNodeEndpoint[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as VpnNodeEndpoint[] : [];
  } catch {
    return [];
  }
}

function mapNode(row: NodeRow): RegisteredVpnNode {
  return {
    id: row.id,
    name: row.name,
    countryCode: row.country_code,
    domain: row.domain,
    status: row.status,
    published: row.published,
    agentVersion: row.agent_version,
    lastSeenAt: iso(row.last_seen_at),
    endpoints: parseEndpoints(row.endpoint_snapshot),
    enrollmentExpiresAt: iso(row.enrollment_expires_at),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function normalizeLocal(value: Partial<StoredVpnNode> & Pick<StoredVpnNode, "id" | "name" | "createdAt">): StoredVpnNode {
  return {
    id: value.id,
    name: value.name,
    countryCode: value.countryCode ?? "--",
    domain: value.domain ?? "",
    status: (value.status as string) === "CONNECTED" ? "ONLINE" : value.status ?? "SETUP_REQUIRED",
    published: value.published ?? false,
    agentVersion: value.agentVersion ?? null,
    lastSeenAt: value.lastSeenAt ?? null,
    endpoints: Array.isArray(value.endpoints) ? value.endpoints : [],
    enrollmentExpiresAt: value.enrollmentExpiresAt ?? null,
    enrollmentTokenHash: value.enrollmentTokenHash ?? null,
    agentTokenHash: value.agentTokenHash ?? null,
    enrolledAt: value.enrolledAt ?? null,
    createdAt: value.createdAt,
  };
}

async function readLocal(): Promise<StoredVpnNode[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(dataFile, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("Invalid VPN node storage");
    return parsed.map((node) => normalizeLocal(node as StoredVpnNode));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocal(nodes: StoredVpnNode[]) {
  await mkdir(dataDir, { recursive: true });
  const temp = `${dataFile}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(nodes), { encoding: "utf8", mode: 0o600 });
  await rename(temp, dataFile);
}

async function mutateLocal<T>(mutation: (nodes: StoredVpnNode[]) => Promise<T> | T): Promise<T> {
  const operation = localMutation.then(async () => {
    const nodes = await readLocal();
    const result = await mutation(nodes);
    await writeLocal(nodes);
    return result;
  });
  localMutation = operation.then(() => undefined, () => undefined);
  return operation;
}

function publicLocal(node: StoredVpnNode): RegisteredVpnNode {
  const { enrollmentTokenHash: _enrollment, agentTokenHash: _agent, enrolledAt: _enrolledAt, ...visible } = node;
  return visible;
}

export async function listRegisteredVpnNodes(): Promise<RegisteredVpnNode[]> {
  await reconcileStaleVpnNodes();
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN nodes in production");
    return (await readLocal()).map(publicLocal).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const result = await getPostgresPool().query(
    "SELECT id, name, country_code, domain, status, published, agent_version, last_seen_at, endpoint_snapshot, enrollment_expires_at, created_at FROM vpn_nodes ORDER BY created_at DESC",
  );
  return result.rows.map(mapNode);
}

/** Persist OFFLINE when an enrolled node stopped reporting. A later healthy heartbeat restores ONLINE. */
export async function reconcileStaleVpnNodes() {
  const cutoff = new Date(Date.now() - staleAfterMs());
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN nodes in production");
    return mutateLocal((nodes) => {
      let changed = 0;
      for (const node of nodes) {
        if ((node.status === "ONLINE" || node.status === "DEGRADED") && (!node.lastSeenAt || new Date(node.lastSeenAt) < cutoff)) {
          node.status = "OFFLINE";
          changed += 1;
        }
      }
      return changed;
    });
  }
  const result = await getPostgresPool().query(
    "UPDATE vpn_nodes SET status='OFFLINE' WHERE status IN ('ONLINE','DEGRADED') AND (last_seen_at IS NULL OR last_seen_at < $1)",
    [cutoff],
  );
  return result.rowCount ?? 0;
}

export async function createRegisteredVpnNode(input: { name: string; countryCode: string; domain: string }) {
  const enrollmentToken = randomBytes(32).toString("base64url");
  const createdAt = new Date().toISOString();
  const enrollmentExpiresAt = new Date(Date.now() + enrollmentLifetimeMs).toISOString();
  const stored: StoredVpnNode = {
    id: `vpn_${randomUUID()}`,
    name: input.name,
    countryCode: input.countryCode,
    domain: input.domain,
    status: "SETUP_REQUIRED",
    published: false,
    agentVersion: null,
    lastSeenAt: null,
    endpoints: [],
    enrollmentExpiresAt,
    enrollmentTokenHash: tokenHash(enrollmentToken),
    agentTokenHash: null,
    enrolledAt: null,
    createdAt,
  };

  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN nodes in production");
    const node = await mutateLocal((nodes) => {
      nodes.push(stored);
      return publicLocal(stored);
    });
    return { node, enrollmentToken };
  }

  const result = await getPostgresPool().query(
    `INSERT INTO vpn_nodes
      (id, name, country_code, domain, status, published, enrollment_token_hash, enrollment_expires_at, created_at)
     VALUES ($1, $2, $3, $4, 'SETUP_REQUIRED', FALSE, $5, $6, NOW())
     RETURNING id, name, country_code, domain, status, published, agent_version, last_seen_at, endpoint_snapshot, enrollment_expires_at, created_at`,
    [stored.id, input.name, input.countryCode, input.domain, stored.enrollmentTokenHash, enrollmentExpiresAt],
  );
  return { node: mapNode(result.rows[0]), enrollmentToken };
}

export async function deleteRegisteredVpnNode(id: string): Promise<"deleted" | "missing" | "published" | "credentials"> {
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN nodes in production");
    return mutateLocal((nodes) => {
      const index = nodes.findIndex((node) => node.id === id);
      if (index === -1) return "missing";
      if (nodes[index].published) return "published";
      nodes.splice(index, 1);
      return "deleted";
    });
  }

  const pool = getPostgresPool();
  const credentials = await pool.query("SELECT 1 FROM device_access_credentials WHERE node_id=$1 AND revoked_at IS NULL LIMIT 1", [id]);
  if (credentials.rowCount) return "credentials";
  const removed = await pool.query("DELETE FROM vpn_nodes WHERE id = $1 AND published = FALSE RETURNING id", [id]);
  if (removed.rowCount) return "deleted";

  const existing = await pool.query("SELECT published FROM vpn_nodes WHERE id = $1", [id]);
  return existing.rowCount && existing.rows[0].published ? "published" : "missing";
}

export async function setRegisteredVpnNodePublished(id: string, published: boolean): Promise<"updated" | "missing" | "unavailable"> {
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN nodes in production");
    return mutateLocal((nodes) => {
      const node = nodes.find((candidate) => candidate.id === id);
      if (!node) return "missing";
      if (published && ((node.status !== "ONLINE" && node.status !== "DRAINING") || node.endpoints.length === 0)) return "unavailable";
      node.published = published;
      if (published && node.status === "DRAINING") node.status = "ONLINE";
      if (!published && node.status === "ONLINE") node.status = "DRAINING";
      return "updated";
    });
  }

  const pool = getPostgresPool();
  const result = await pool.query(
    "UPDATE vpn_nodes SET published=$2, status=CASE WHEN $2=FALSE AND status='ONLINE' THEN 'DRAINING' WHEN $2=TRUE AND status='DRAINING' THEN 'ONLINE' ELSE status END WHERE id=$1 AND ($2=FALSE OR (status IN ('ONLINE','DRAINING') AND jsonb_array_length(endpoint_snapshot)>0)) RETURNING id",
    [id, published],
  );
  if (result.rowCount) return "updated";
  const existing = await pool.query("SELECT id FROM vpn_nodes WHERE id=$1", [id]);
  return existing.rowCount ? "unavailable" : "missing";
}

export async function enrollVpnNode(enrollmentToken: string) {
  const enrollmentTokenHash = tokenHash(enrollmentToken);
  const agentToken = randomBytes(32).toString("base64url");
  const agentTokenHash = tokenHash(agentToken);
  const now = new Date();

  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN node enrollment");
    const node = await mutateLocal((nodes) => {
      const found = nodes.find((candidate) => candidate.enrollmentTokenHash === enrollmentTokenHash);
      if (!found || !found.enrollmentExpiresAt || new Date(found.enrollmentExpiresAt) <= now) return null;
      found.enrollmentTokenHash = null;
      found.enrollmentExpiresAt = null;
      found.agentTokenHash = agentTokenHash;
      found.enrolledAt = now.toISOString();
      found.status = "ENROLLING";
      return publicLocal(found);
    });
    return node ? { node, agentToken } : null;
  }

  const result = await getPostgresPool().query(
    `UPDATE vpn_nodes
       SET enrollment_token_hash = NULL, enrollment_expires_at = NULL,
           agent_token_hash = $2, enrolled_at = NOW(), status = 'ENROLLING'
     WHERE enrollment_token_hash = $1 AND enrollment_expires_at > NOW()
     RETURNING id, name, country_code, domain, status, published, agent_version, last_seen_at, endpoint_snapshot, enrollment_expires_at, created_at`,
    [enrollmentTokenHash, agentTokenHash],
  );
  return result.rowCount ? { node: mapNode(result.rows[0]), agentToken } : null;
}

export async function recordVpnNodeHeartbeat(agentToken: string, report: VpnNodeHealthReport) {
  const agentTokenHash = tokenHash(agentToken);
  const status: VpnNodeStatus = report.xrayActive && report.configValid && report.endpoints.length > 0 ? "ONLINE" : "DEGRADED";
  const now = new Date().toISOString();

  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN node heartbeat");
    return mutateLocal((nodes) => {
      const found = nodes.find((candidate) => candidate.agentTokenHash === agentTokenHash);
      if (!found) return null;
      found.agentVersion = report.agentVersion;
      found.lastSeenAt = now;
      found.endpoints = report.endpoints;
      if (found.status !== "DRAINING") found.status = status;
      return publicLocal(found);
    });
  }

  const result = await getPostgresPool().query(
    `UPDATE vpn_nodes
       SET agent_version = $2, last_seen_at = NOW(), endpoint_snapshot = $3::jsonb,
           status = CASE WHEN status='DRAINING' THEN 'DRAINING' ELSE $4 END
     WHERE agent_token_hash = $1
     RETURNING id, name, country_code, domain, status, published, agent_version, last_seen_at, endpoint_snapshot, enrollment_expires_at, created_at`,
    [agentTokenHash, report.agentVersion, JSON.stringify(report.endpoints), status],
  );
  return result.rowCount ? mapNode(result.rows[0]) : null;
}
