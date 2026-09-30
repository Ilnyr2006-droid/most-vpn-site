import type { Device, Subscription } from "@/lib/models";
import { getPostgresPool, hasDatabase } from "@/lib/db/postgres";

export type UserAccount = {
  subscription: Subscription | null;
  devices: Device[];
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: Subscription["planId"];
  status: Subscription["status"];
  ends_at: Date | string;
  device_limit: number;
};

type DeviceRow = {
  id: string;
  user_id: string;
  name: string;
  platform: Device["platform"];
  status: Device["status"];
  added_at: Date | string;
};

function subscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    endsAt: new Date(row.ends_at).toISOString().slice(0, 10),
    deviceLimit: Number(row.device_limit),
  };
}

function device(row: DeviceRow): Device {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    platform: row.platform,
    status: row.status,
    addedAt: new Date(row.added_at).toISOString(),
  };
}

function assertStorage() {
  if (process.env.NODE_ENV === "production" && !hasDatabase()) {
    throw new Error("DATABASE_URL is required for production account data");
  }
}

export async function getUserAccount(userId: string): Promise<UserAccount> {
  assertStorage();
  if (!hasDatabase()) return { subscription: null, devices: [] };

  const pool = getPostgresPool();
  const [subscriptions, devices] = await Promise.all([
    pool.query<SubscriptionRow>(
      `SELECT id, user_id, plan_id, status, ends_at, device_limit
         FROM subscriptions
        WHERE user_id = $1
        ORDER BY ends_at DESC
        LIMIT 1`,
      [userId],
    ),
    pool.query<DeviceRow>(
      `SELECT id, user_id, name, platform, status, added_at
         FROM user_devices
        WHERE user_id = $1 AND revoked_at IS NULL
        ORDER BY added_at DESC`,
      [userId],
    ),
  ]);

  return {
    subscription: subscriptions.rows[0] ? subscription(subscriptions.rows[0]) : null,
    devices: devices.rows.map(device),
  };
}

export function subscriptionIsActive(value: Subscription | null) {
  return Boolean(value && value.status === "ACTIVE" && value.endsAt >= new Date().toISOString().slice(0, 10));
}
