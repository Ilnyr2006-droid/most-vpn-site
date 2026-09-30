import { authStore } from "@/lib/auth/repository";
import { getDevVpnNodeStatus, type VpnNodeStatus } from "@/lib/provisioning/dev-ssh";
import { listConversations } from "@/lib/support/repository";

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
};

export async function getAdminData(): Promise<AdminData> {
  const [users, conversations, nodeResult] = await Promise.all([
    authStore.listUsers(100),
    listConversations(),
    getDevVpnNodeStatus()
      .then((nodes) => ({ nodes, available: true }))
      .catch(() => ({ nodes: [] as VpnNodeStatus[], available: false })),
  ]);

  return {
    clients: users.map((user) => ({
      id: user.id,
      phone: user.phone,
      createdAt: user.createdAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
    })),
    openConversations: conversations.filter((item) => item.status === "open").length,
    nodes: nodeResult.nodes.map((node) => ({
      ...node,
      id: `reality-${node.port}`,
      status: "ONLINE",
      ...connectionDetails(node.port),
    })),
    nodeStatusAvailable: nodeResult.available,
  };
}
