import Link from "next/link";
import { formatPrice, plans } from "@/lib/plans";

export function PricingCards() {
  return (
    <div className="pricing-grid">
      {Object.values(plans).map((plan) => {
        const featured = plan.id === "annual";
        return (
          <article className={`price-card ${featured ? "featured" : ""}`} key={plan.id}>
            {featured && <div className="price-badge mono">ВЫГОДНЕЕ</div>}
            <span className="mono">{plan.name.toUpperCase()}</span>
            <div className="price"><strong>{formatPrice(plan.price)}</strong><small>₽ / {plan.period}</small></div>
            <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <Link className="cta-wide" href={`/checkout?plan=${plan.id}`}>
              {featured ? "Выбрать год" : "Подключиться"} <span>↗</span>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
