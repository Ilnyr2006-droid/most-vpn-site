import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
const rows=["Германия","Польша","Нидерланды","Платежи"];
export default function StatusPage(){return <main><SiteHeader /><section className="inner-hero section-shell status-hero"><h1>Статус сервисов.</h1><p>Публичный мониторинг включится вместе с рабочими серверами и оплатой. До этого страница не показывает неподтверждённую доступность.</p></section><section className="status-list section-shell">{rows.map((x)=><div key={x}><span>{x}</span><span className="mono muted-text">ЕЩЁ НЕ ЗАПУЩЕНО</span></div>)}</section><Footer /></main>}
