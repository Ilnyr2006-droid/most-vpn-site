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
};

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
    })),
    nodeStatusAvailable: nodeResult.available,
  };
}
