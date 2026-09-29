import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
const services = [["Германия", "ONLINE"], ["Польша", "ONLINE"], ["Нидерланды", "ONLINE"], ["Оплаты", "ЕЩЁ НЕ ЗАПУЩЕНО"]];
export default function StatusPage(){return <main><SiteHeader/><section className="inner-hero section-shell"><h1>Статус<br/>сервиса.</h1><p>Актуальные состояния локаций и оплат. Страница подготовлена для данных из API.</p></section><section className="status-list section-shell">{services.map(([name, status])=><div key={name}><span>{name}</span><b className="mono"><i className={status === "ONLINE" ? "status-dot" : ""}/>{status}</b></div>)}</section><Footer/></main>}
