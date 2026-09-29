import { CheckoutForm } from "@/components/CheckoutForm";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { formatPrice, isPlanId, plans } from "@/lib/plans";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan: rawPlan } = await searchParams;
  const planId = isPlanId(rawPlan) ? rawPlan : "monthly";
  const plan = plans[planId];

  return (
    <main>
      <SiteHeader />
      <section className="checkout section-shell">
        <div className="checkout-copy">
          <span className="mono">ОФОРМЛЕНИЕ</span>
          <h1>Проверьте тариф<br />и оставьте контакт.</h1>
          <p>После подключения платёжного провайдера здесь откроется его защищённая форма. Данные карты MOST не получает и не хранит. VPN-доступ появится в личном кабинете сразу после подтверждения оплаты.</p>
        </div>
        <aside className="checkout-card">
          <div className="checkout-plan"><span>{plan.name}</span><strong>{formatPrice(plan.price)} ₽</strong></div>
          <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          <CheckoutForm planId={planId} />
        </aside>
      </section>
      <Footer />
    </main>
  );
}
