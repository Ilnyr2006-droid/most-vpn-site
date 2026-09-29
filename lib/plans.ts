export const plans = {
  monthly: {
    id: "monthly",
    name: "1 месяц",
    price: 299,
    period: "месяц",
    features: ["до 3 устройств", "3 доступные локации", "поддержка в Telegram"],
  },
  annual: {
    id: "annual",
    name: "1 год",
    price: 2690,
    period: "год",
    features: ["до 3 устройств", "3 доступные локации", "поддержка в Telegram"],
  },
} as const;

export type PlanId = keyof typeof plans;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in plans;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}
