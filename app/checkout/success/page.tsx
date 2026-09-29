import Link from "next/link";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";

export default function PaymentSuccessPage() {
  return <main><SiteHeader /><section className="result-page section-shell"><span className="status-dot"/><h1>Платёж обрабатывается.</h1><p>Доступ появится только после подтверждения платежа сервером. Инструкцию отправим на email, указанный при оформлении.</p><Link className="cta" href="/help">Открыть помощь <span>↗</span></Link></section><Footer /></main>;
}
