"use client";

import { FormEvent, useState } from "react";
import type { PlanId } from "@/lib/plans";

export function CheckoutForm({ planId }: { planId: PlanId }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          email: form.get("email"),
          contact: form.get("contact"),
          accepted: form.get("accepted") === "on",
        }),
      });
      const result = await response.json() as { confirmationUrl?: string; error?: string };
      if (!response.ok || !result.confirmationUrl) {
        setMessage(result.error ?? "Не удалось перейти к оплате");
        return;
      }
      window.location.assign(result.confirmationUrl);
    } catch {
      setMessage("Не удалось связаться с сервером. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={submit}>
      <label>Email для чека и доступа<input name="email" type="email" autoComplete="email" required /></label>
      <label>Telegram или телефон <small>необязательно, для поддержки</small><input name="contact" type="text" autoComplete="tel" /></label>
      <label className="checkout-consent"><input name="accepted" type="checkbox" required /><span>Принимаю <a href="/terms" target="_blank">условия сервиса</a> и <a href="/privacy" target="_blank">политику конфиденциальности</a>.</span></label>
      <button className="cta checkout-submit" type="submit" disabled={loading}>{loading ? "Подготовка…" : "Перейти к оплате"}<span>↗</span></button>
      <p className="checkout-message" aria-live="polite">{message}</p>
    </form>
  );
}
