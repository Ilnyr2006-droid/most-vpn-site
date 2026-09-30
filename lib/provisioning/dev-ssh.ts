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

async function runStatusCommand() {
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
        "status",
      ],
      { timeout: 15_000, maxBuffer: 16 * 1024 },
    );
  } catch {
    throw new DevProvisioningError("Development VPN node is unavailable.");
  }
}

export async function getDevVpnNodeStatus(): Promise<VpnNodeStatus[]> {
  const { stdout } = await runStatusCommand();
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
