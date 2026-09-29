import Link from "next/link";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
export default function PaymentSuccessPage() { return <main><SiteHeader /><section className="result-page section-shell"><span className="status-dot"/><h1>Платёж подтверждается.</h1><p>После подтверждения доступ появится в личном кабинете. Там можно подключить устройства и выбрать способ настройки.</p><Link className="cta" href="/account">Открыть личный кабинет <span>↗</span></Link></section><Footer /></main>; }
