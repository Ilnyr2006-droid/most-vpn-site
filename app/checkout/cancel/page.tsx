import Link from "next/link";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";

export default function PaymentCancelPage() {
  return <main><SiteHeader /><section className="result-page section-shell"><h1>Оплата не завершена.</h1><p>Деньги не должны быть списаны. Можно вернуться к тарифам и попробовать ещё раз.</p><Link className="cta" href="/#pricing">Вернуться к тарифам <span>↗</span></Link></section><Footer /></main>;
}
