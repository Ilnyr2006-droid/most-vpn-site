import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { PricingCards } from "@/components/PricingCards";

export default function PricingPage() {
  return <main><SiteHeader /><section className="inner-hero section-shell"><h1>Просто выбрать.<br />Просто продлить.</h1><p>Возможности одинаковые — отличается только срок подписки. Перед оплатой вы увидите итоговую сумму и условия.</p></section><section className="pricing section-shell inner-pricing"><PricingCards /></section><Footer /></main>;
}
