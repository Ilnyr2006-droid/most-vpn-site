import type { Order, Payment } from "@/lib/models";
export class PaymentNotConfiguredError extends Error { constructor() { super("Payment provider is not configured"); } }
export interface PaymentRequest { order: Order; email: string; contact?: string; }
export interface PaymentCreation { payment: Payment; confirmationUrl: string; }
/** Replace this implementation with a provider adapter. The order ID and idempotency key must stay stable for retries. */
export async function createPayment(_request: PaymentRequest): Promise<PaymentCreation> { throw new PaymentNotConfiguredError(); }
/** Webhook adapters must verify signature, load payment/order, then transition PENDING -> SUCCEEDED once. */
export async function confirmPaymentWebhook(_providerPayload: unknown): Promise<void> { throw new PaymentNotConfiguredError(); }
