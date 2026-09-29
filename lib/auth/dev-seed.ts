import type { User } from "@/lib/models";
import { authStore } from "@/lib/auth/repository";
/** Development-only convenience seed. It creates a normal user; sign-in still requires the usual code flow. */
export async function ensureDevSeedUser(): Promise<User | null> {
  if (process.env.NODE_ENV === "production" || process.env.DEV_SEED_USER !== "true") return null;
  const phone = process.env.DEV_SEED_PHONE;
  if (!phone || !/^\+7\d{10}$/.test(phone)) return null;
  return await authStore.findUserByPhone(phone) ?? await authStore.createUser(phone);
}
