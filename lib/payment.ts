import type { PlanId } from "@/lib/plans";

export type CreatePaymentInput = {
  planId: PlanId;
  email: string;
  contact?: string;
  idempotencyKey: string;
};

export type CreatePaymentResult = {
  paymentId: string;
  confirmationUrl: string;
};

export class PaymentNotConfiguredError extends Error {}

export async function createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
  // Единственная точка для SDK/API выбранного платёжного провайдера.
  // Цена должна браться на сервере из lib/plans.ts, а не из запроса браузера.
  throw new PaymentNotConfiguredError("Платёжный провайдер ещё не подключён");
}
