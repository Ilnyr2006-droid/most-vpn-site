import type { AccessCredential, Device, Order, Payment, Subscription, TelegramLink, User } from "@/lib/models";

export const mockUser: User = { id: "usr_most_demo", phone: "+79990000000", phoneVerifiedAt: "2026-09-01T00:00:00Z", email: "hello@most.example", telegramId: "123456789", createdAt: "2026-09-01T00:00:00Z" };
export const mockSubscription: Subscription = { id: "sub_most_demo", userId: mockUser.id, planId: "monthly", status: "ACTIVE", endsAt: "2026-10-29", deviceLimit: 3 };
export const mockDevices: Device[] = [
  { id: "dev_iphone", userId: mockUser.id, name: "iPhone 16", platform: "iOS", status: "CONNECTED", addedAt: "2026-09-02" },
  { id: "dev_macbook", userId: mockUser.id, name: "MacBook Air", platform: "macOS", status: "CONNECTED", addedAt: "2026-09-04" },
];
export function getMockCredential(deviceId = "new-device"): AccessCredential {
  return { id: `cred_${deviceId}`, deviceId, subscriptionUrl: "https://access.most.example/subscription/mock", deepLink: "happ://import?url=https%3A%2F%2Faccess.most.example%2Fsubscription%2Fmock", manualConfig: "vless://mock-access-configuration", qrValue: "MOST:mock-access", ikev2: { server: "vpn-de.most.example", remoteId: "vpn-de.most.example", localId: "", username: "most-demo-user", password: "demo-password" } };
}
export function createDraftOrder(planId: Order["planId"], amount: number, orderId?: string, userId: string | null = null): Order {
  const id = orderId ? `ord_${orderId}` : `ord_${crypto.randomUUID()}`;
  return { id, userId, planId, amount, idempotencyKey: `most:${id}`, status: "DRAFT" };
}
export function mockPayment(order: Order): Payment { return { id: `pay_${order.id}`, orderId: order.id, amount: order.amount, status: "PENDING", providerPaymentId: null }; }
export function getTelegramLink(): TelegramLink { return { id: "tgl_demo", userId: mockUser.id, token: "one-time-token-placeholder", expiresAt: "2026-10-01T12:00:00Z", telegramId: mockUser.telegramId }; }
