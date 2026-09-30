export type VpnNodeStatus = "SETUP_REQUIRED" | "ENROLLING" | "ONLINE" | "DEGRADED" | "OFFLINE" | "DRAINING";

export type VpnNodeEndpoint = {
  port: number;
  network: "tcp" | "xhttp";
  serverName: string;
  publicKey: string;
  shortId: string;
  flow: string;
  path: string;
};

export type RegisteredVpnNode = {
  id: string;
  name: string;
  countryCode: string;
  domain: string;
  status: VpnNodeStatus;
  published: boolean;
  agentVersion: string | null;
  lastSeenAt: string | null;
  endpoints: VpnNodeEndpoint[];
  enrollmentExpiresAt: string | null;
  createdAt: string;
};

export type VpnNodeHealthReport = {
  hostname: string;
  agentVersion: string;
  xrayActive: boolean;
  configValid: boolean;
  endpoints: VpnNodeEndpoint[];
};
