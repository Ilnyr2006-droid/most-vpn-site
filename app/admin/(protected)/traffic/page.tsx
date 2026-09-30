import { AdminHeading } from "@/components/AdminShell";

export default function AdminTrafficPage() {
  return <>
    <AdminHeading eyebrow="NETWORK" title="Трафик" text="Здесь будут метрики, собранные с серверных агентов." />
    <section className="admin-traffic-summary"><article><span className="mono">СЕГОДНЯ</span><strong>—</strong><small>агент не подключён</small></article><article><span className="mono">7 ДНЕЙ</span><strong>—</strong><small>агент не подключён</small></article><article><span className="mono">ПИК</span><strong>—</strong><small>агент не подключён</small></article></section>
    <section className="admin-panel admin-traffic-large"><header><div><span className="mono">24 HOURS</span><h2>Нагрузка сети</h2></div></header><p>На ноде пока доступен только безопасный статус Xray-входов. Для трафика, нагрузки CPU/RAM и истории нужен отдельный read-only агент метрик.</p></section>
  </>;
}
