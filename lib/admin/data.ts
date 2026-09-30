import { authStore } from "@/lib/auth/repository";
import { getDevVpnNodeMetrics, getDevVpnNodeStatus, type VpnNodeMetrics, type VpnNodeStatus } from "@/lib/provisioning/dev-ssh";
import { listConversations } from "@/lib/support/repository";

const nodeSnapshotTtlMs = 10_000;

type NodeSnapshot = {
  nodes: VpnNodeStatus[];
  nodeStatusAvailable: boolean;
  metrics: VpnNodeMetrics | null;
};

type NodeSnapshotCache = {
  value: NodeSnapshot | null;
  expiresAt: number;
  pending: Promise<NodeSnapshot> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __mostAdminNodeSnapshot: NodeSnapshotCache | undefined;
}

const nodeSnapshotCache = globalThis.__mostAdminNodeSnapshot ?? {
  value: null,
  expiresAt: 0,
  pending: null,
};

globalThis.__mostAdminNodeSnapshot = nodeSnapshotCache;

export type AdminClient = {
  id: string;
  phone: string;
  createdAt: string;
  phoneVerifiedAt: string;
};

export type AdminNode = VpnNodeStatus & {
  id: string;
  status: "ONLINE" | "OFFLINE";
  role: "Основной" | "Резервный" | "Дополнительный";
  protocol: string;
  note: string;
};

function connectionDetails(port: number) {
  if (port === 9443) {
    return {
      role: "Основной" as const,
      protocol: "VLESS + Reality + TCP + XTLS-Vision",
      note: "Используется по умолчанию: обычно даёт меньшую задержку.",
    };
  }

  if (port === 9444) {
    return {
      role: "Резервный" as const,
      protocol: "VLESS + Reality + XHTTP",
      note: "Используется, если основной вариант недоступен или нестабилен.",
    };
  }

  return {
    role: "Дополнительный" as const,
    protocol: `Reality / ${port}`,
    note: "Дополнительный вариант подключения.",
  };
}

export type AdminData = {
  clients: AdminClient[];
  openConversations: number;
  nodes: AdminNode[];
  nodeStatusAvailable: boolean;
  metrics: VpnNodeMetrics | null;
};

async function getNodeSnapshot(): Promise<NodeSnapshot> {
  if (nodeSnapshotCache.value && nodeSnapshotCache.expiresAt > Date.now()) {
    return nodeSnapshotCache.value;
  }

  if (nodeSnapshotCache.pending) return nodeSnapshotCache.pending;

  nodeSnapshotCache.pending = Promise.all([
    getDevVpnNodeStatus()
      .then((nodes) => ({ nodes, available: true }))
      .catch(() => ({ nodes: [] as VpnNodeStatus[], available: false })),
    getDevVpnNodeMetrics().catch(() => null),
  ]).then(([status, metrics]) => {
    const snapshot = {
      nodes: status.nodes,
      nodeStatusAvailable: status.available,
      metrics,
    };
    nodeSnapshotCache.value = snapshot;
    nodeSnapshotCache.expiresAt = Date.now() + nodeSnapshotTtlMs;
    return snapshot;
  }).finally(() => {
    nodeSnapshotCache.pending = null;
  });

  return nodeSnapshotCache.pending;
}

export async function getAdminData(): Promise<AdminData> {
  const [users, conversations, snapshot] = await Promise.all([
    authStore.listUsers(100),
    listConversations(),
    getNodeSnapshot(),
  ]);

  return {
    clients: users.map((user) => ({
      id: user.id,
      phone: user.phone,
      createdAt: user.createdAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
    })),
    openConversations: conversations.filter((item) => item.status === "open").length,
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      id: `reality-${node.port}`,
      status: "ONLINE",
      ...connectionDetails(node.port),
    })),
    nodeStatusAvailable: snapshot.nodeStatusAvailable,
    metrics: snapshot.metrics,
  };
}
