import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
const services = ["Германия", "Польша", "Нидерланды", "Оплаты"];
export default function StatusPage(){return <main><SiteHeader/><section className="inner-hero section-shell"><h1>Статус<br/>сервиса.</h1><p>Состояния локаций и оплат появятся здесь после запуска.</p></section><section className="status-list section-shell">{services.map(name=><div key={name}><span>{name}</span><b className="mono">ЕЩЁ НЕ ЗАПУЩЕНО</b></div>)}</section><Footer/></main>}
