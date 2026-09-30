import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import type { User, VerificationChallenge } from "@/lib/models";
import { authStore, assertProductionAuthStorage } from "@/lib/auth/repository";
import { getVerificationProvider } from "@/lib/auth/verification-provider";
import { ensureDevSeedUser } from "@/lib/auth/dev-seed";
function secret(name: "OTP_SECRET" | "SESSION_SECRET") { const value = process.env[name]; if (value) return value; if (process.env.NODE_ENV === "production") throw new Error(`${name} must be configured`); return `most-development-${name}`; }
export function normalizePhone(input: string) { const digits = input.replace(/\D/g, ""); const normalized = digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8")) ? `+7${digits.slice(1)}` : digits.length === 10 ? `+7${digits}` : ""; if (!/^\+7\d{10}$/.test(normalized)) throw new Error("Введите номер в формате +7 999 123-45-67"); return normalized; }
function hashCode(challengeId: string, code: string) { return createHmac("sha256", secret("OTP_SECRET")).update(`${challengeId}:${code}`).digest("hex"); }
export type VerificationRequestResult = { kind: "challenge"; challengeId: string; phone: string } | { kind: "authenticated"; phone: string; user: User };
function canUseDevAuthBypass(phone: string) {
  if (process.env.NODE_ENV === "production") {
    if (process.env.DEV_AUTH_BYPASS_ENABLED === "true") throw new Error("DEV_AUTH_BYPASS_ENABLED is forbidden in production");
    return false;
  }
  if ((process.env.VERIFICATION_PROVIDER ?? "mock") !== "mock" || process.env.DEV_AUTH_BYPASS_ENABLED !== "true") return false;
  const configuredPhone = process.env.DEV_AUTH_BYPASS_PHONE;
  if (!configuredPhone) throw new Error("DEV_AUTH_BYPASS_PHONE must be configured when development bypass is enabled");
  return phone === normalizePhone(configuredPhone);
}
async function findOrCreateVerifiedUser(phone: string) {
  const existing = await authStore.findUserByPhone(phone);
  if (!existing) return await authStore.createUser(phone);
  return await authStore.markUserPhoneVerified(existing.id);
}
export async function requestVerification(phoneInput: string, ip: string | null): Promise<VerificationRequestResult> { assertProductionAuthStorage(); await ensureDevSeedUser(); const phone = normalizePhone(phoneInput); if (canUseDevAuthBypass(phone)) return { kind: "authenticated", phone, user: await findOrCreateVerifiedUser(phone) }; if (!await authStore.check(`phone:minute:${phone}`, 1, 60_000) || !await authStore.check(`phone:hour:${phone}`, 5, 3_600_000) || !await authStore.check(`ip:hour:${ip ?? "unknown"}`, 20, 3_600_000)) throw new Error("Попробуйте запросить код позже"); const id = randomUUID(); const code = String(randomInt(0, 1_000_000)).padStart(6, "0"); const now = new Date(); const challenge: VerificationChallenge = { id, phone, codeHash: hashCode(id, code), channel: "sms", expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(), attempts: 0, maxAttempts: 5, lastSentAt: now.toISOString(), usedAt: null, providerRequestId: null, createdAt: now.toISOString() }; const providerResult = await getVerificationProvider().sendCode({ phone, code, challengeId: id }); challenge.providerRequestId = providerResult.providerRequestId ?? null; await authStore.createChallenge(challenge); return { kind: "challenge", challengeId: id, phone }; }
export async function verifyCode(challengeId: string, code: string): Promise<User> { assertProductionAuthStorage(); const challenge = await authStore.find(challengeId); if (!challenge || challenge.usedAt) throw new Error("Код больше не действует. Запросите новый."); if (new Date(challenge.expiresAt) < new Date()) throw new Error("Срок действия кода истёк. Запросите новый."); if (challenge.attempts >= challenge.maxAttempts) throw new Error("Превышено число попыток. Запросите новый код."); if (!/^\d{6}$/.test(code)) throw new Error("Введите 6 цифр кода"); const actual = Buffer.from(hashCode(challenge.id, code), "hex"); const expected = Buffer.from(challenge.codeHash, "hex"); const correct = actual.length === expected.length && timingSafeEqual(actual, expected); if (!correct) { const updated = await authStore.recordFailedChallengeAttempt(challenge.id); if (!updated) throw new Error("Код больше не действует. Запросите новый."); throw new Error(updated.attempts >= updated.maxAttempts ? "Превышено число попыток. Запросите новый код." : "Неверный код"); } const consumed = await authStore.consumeVerifiedChallenge(challenge.id, challenge.codeHash);
  if (!consumed) throw new Error("Код уже использован. Запросите новый.");
  return await authStore.findUserByPhone(challenge.phone) ?? await authStore.createUser(challenge.phone); }
export function createSessionToken() { return randomUUID() + randomUUID(); }
export function hashSessionToken(token: string) { return createHmac("sha256", secret("SESSION_SECRET")).update(token).digest("hex"); }
