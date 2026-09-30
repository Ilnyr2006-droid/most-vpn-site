import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REMOTE_PROVISIONER = "/usr/local/sbin/most-vpn-provision";

export type VpnNodeStatus = {
  port: number;
  clients: number;
  security: string;
};

export type VpnNodeMetrics = {
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  rxMbps: number;
  txMbps: number;
  uptimeSeconds: number;
};

export class DevProvisioningError extends Error {}

function getConfiguration() {
  if (process.env.NODE_ENV === "production" || process.env.DEV_VPN_PROVISIONING_ENABLED !== "true") {
    throw new DevProvisioningError("Development VPN provisioning is disabled.");
  }

  const host = process.env.DEV_VPN_PROVISIONING_HOST;
  const privateKeyPath = process.env.DEV_VPN_PROVISIONING_SSH_KEY_PATH;
  const knownHostsPath = process.env.DEV_VPN_PROVISIONING_KNOWN_HOSTS_PATH;

  if (!host || !/^root@[a-zA-Z0-9.-]+$/.test(host)) {
    throw new DevProvisioningError("Development VPN host is not configured.");
  }

  if (!privateKeyPath?.startsWith("/") || !knownHostsPath?.startsWith("/")) {
    throw new DevProvisioningError("Development VPN SSH paths are not configured.");
  }

  return { host, privateKeyPath, knownHostsPath };
}

async function runCommand(command: "status" | "metrics") {
  const { host, privateKeyPath, knownHostsPath } = getConfiguration();

  try {
    await Promise.all([access(privateKeyPath), access(knownHostsPath)]);
    return await execFileAsync(
      "/usr/bin/ssh",
      [
        "-i",
        privateKeyPath,
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=12",
        "-o",
        "StrictHostKeyChecking=yes",
        "-o",
        `UserKnownHostsFile=${knownHostsPath}`,
        host,
        REMOTE_PROVISIONER,
        command,
      ],
      { timeout: 15_000, maxBuffer: 16 * 1024 },
    );
  } catch {
    throw new DevProvisioningError("Development VPN node is unavailable.");
  }
}

export async function getDevVpnNodeStatus(): Promise<VpnNodeStatus[]> {
  const { stdout } = await runCommand("status");
  const lines = stdout.trim().split("\n").filter(Boolean);

  if (lines.length === 0) {
    throw new DevProvisioningError("Development VPN node returned no status.");
  }

  return lines.map((line) => {
    const match = /^port=(\d{1,5}) clients=(\d+) security=([a-z0-9_-]+)$/.exec(line.trim());
    if (!match) {
      throw new DevProvisioningError("Development VPN node returned invalid status.");
    }

    const port = Number(match[1]);
    if (port < 1 || port > 65535) {
      throw new DevProvisioningError("Development VPN node returned invalid status.");
    }

    return { port, clients: Number(match[2]), security: match[3] };
  });
}

export async function getDevVpnNodeMetrics(): Promise<VpnNodeMetrics> {
  const { stdout } = await runCommand("metrics");
  const match = /^cpuPercent=(\d+(?:\.\d+)?) ramPercent=(\d+(?:\.\d+)?) diskPercent=(\d+(?:\.\d+)?) rxMbps=(\d+(?:\.\d+)?) txMbps=(\d+(?:\.\d+)?) uptimeSeconds=(\d+)$/.exec(stdout.trim());

  if (!match) {
    throw new DevProvisioningError("Development VPN node returned invalid metrics.");
  }

  const [cpuPercent, ramPercent, diskPercent, rxMbps, txMbps, uptimeSeconds] = match.slice(1).map(Number);
  if (
    [cpuPercent, ramPercent, diskPercent, rxMbps, txMbps, uptimeSeconds].some((value) => !Number.isFinite(value) || value < 0) ||
    cpuPercent > 100 || ramPercent > 100 || diskPercent > 100
  ) {
    throw new DevProvisioningError("Development VPN node returned invalid metrics.");
  }

  return { cpuPercent, ramPercent, diskPercent, rxMbps, txMbps, uptimeSeconds };
}
