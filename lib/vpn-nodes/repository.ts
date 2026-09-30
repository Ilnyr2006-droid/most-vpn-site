import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hasDatabase, getPostgresPool } from "@/lib/db/postgres";
import type { RegisteredVpnNode } from "@/lib/vpn-nodes/types";

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "vpn-nodes.json");
let localMutation = Promise.resolve();

function mapNode(row: { id: string; name: string; status: RegisteredVpnNode["status"]; created_at: Date | string }): RegisteredVpnNode {
  return { id: row.id, name: row.name, status: row.status, createdAt: new Date(row.created_at).toISOString() };
}

async function readLocal(): Promise<RegisteredVpnNode[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(dataFile, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("Invalid VPN node storage");
    return parsed as RegisteredVpnNode[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocal(nodes: RegisteredVpnNode[]) {
  await mkdir(dataDir, { recursive: true });
  const temp = `${dataFile}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(nodes), { encoding: "utf8", mode: 0o600 });
  await rename(temp, dataFile);
}

export async function listRegisteredVpnNodes(): Promise<RegisteredVpnNode[]> {
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN nodes in production");
    return (await readLocal()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const result = await getPostgresPool().query("SELECT id, name, status, created_at FROM vpn_nodes ORDER BY created_at DESC");
  return result.rows.map(mapNode);
}

export async function createRegisteredVpnNode(name: string): Promise<RegisteredVpnNode> {
  const node: RegisteredVpnNode = { id: `vpn_${randomUUID()}`, name, status: "SETUP_REQUIRED", createdAt: new Date().toISOString() };
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for VPN nodes in production");
    const mutation = localMutation.then(async () => {
      const nodes = await readLocal();
      nodes.push(node);
      await writeLocal(nodes);
      return node;
    });
    localMutation = mutation.then(() => undefined, () => undefined);
    return mutation;
  }

  const result = await getPostgresPool().query(
    "INSERT INTO vpn_nodes (id, name, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, status, created_at",
    [node.id, node.name, node.status],
  );
  return mapNode(result.rows[0]);
}
