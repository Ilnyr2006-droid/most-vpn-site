export type Platform = "iOS" | "Android" | "Windows" | "macOS" | "Linux";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED";
export type ServiceStatus = "ONLINE" | "DEGRADED" | "OFFLINE" | "NOT_STARTED";
export type VerificationChannel = "sms" | "call";
export interface User { id: string; phone: string; phoneVerifiedAt: string; email: string | null; telegramId: string | null; createdAt: string; }
export interface Session { id: string; userId: string; tokenHash: string; createdAt: string; expiresAt: string; revokedAt: string | null; }
export interface AuthSession { session: Session; user: User; }
export interface VerificationChallenge { id: string; phone: string; codeHash: string; channel: VerificationChannel; expiresAt: string; attempts: number; maxAttempts: number; lastSentAt: string; usedAt: string | null; providerRequestId: string | null; createdAt: string; }
export interface Subscription { id: string; userId: string; planId: "monthly" | "annual"; status: SubscriptionStatus; endsAt: string; deviceLimit: number; }
export interface Payment { id: string; orderId: string; amount: number; status: "PENDING" | "SUCCEEDED" | "FAILED"; providerPaymentId: string | null; }
export interface Device { id: string; userId: string; name: string; platform: Platform; status: "CONNECTED" | "DISCONNECTED"; addedAt: string; }
export interface AccessCredential { id: string; deviceId: string; subscriptionUrl: string; deepLink: string; manualConfig: string; qrValue: string; }
export interface TelegramLink { id: string; userId: string; token: string; expiresAt: string; telegramId: string | null; }
export interface Order { id: string; userId: string | null; planId: "monthly" | "annual"; amount: number; idempotencyKey: string; status: "DRAFT" | "PENDING_PAYMENT" | "PAID"; }
