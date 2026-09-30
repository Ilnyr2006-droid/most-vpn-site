import Link from "next/link";
import { AdminHeading } from "@/components/AdminShell";
import { getAdminData } from "@/lib/admin/data";

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="admin-stat"><span className="mono">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export default async function AdminPage() {
  const data = await getAdminData();
  const connectedClients = data.nodes.reduce((total, node) => total + node.clients, 0);

  return <>
    <AdminHeading eyebrow="MOST / CONTROL" title="Обзор" text="Подтверждённые данные пользователей, поддержки и VPN-ноды."
      aside={<span className="admin-live"><i className={data.nodeStatusAvailable ? "" : "is-warn"} /> {data.nodeStatusAvailable ? "LIVE" : "TELEMETRY UNAVAILABLE"}</span>} />

    <section className="admin-stats-grid">
      <Stat label="КЛИЕНТЫ" value={String(data.clients.length)} note="зарегистрировано" />
      <Stat label="VPN-ВХОДЫ" value={String(data.nodes.length)} note={data.nodeStatusAvailable ? "доступно по SSH" : "телеметрия недоступна"} />
      <Stat label="VPN-КЛИЕНТЫ" value={String(connectedClients)} note="записей на входах" />
      <Stat label="ОБРАЩЕНИЯ" value={String(data.openConversations)} note="ожидают ответа" />
    </section>

    <section className="admin-dashboard-grid">
      <article className="admin-panel admin-traffic-panel"><header><div><span className="mono">NETWORK</span><h2>Трафик</h2></div><Link href="/admin/traffic">Подробнее ↗</Link></header><p>Серверный агент метрик ещё не подключён. График не отображается, чтобы не подменять реальные данные.</p></article>
      <article className="admin-panel admin-alerts"><header><div><span className="mono">ATTENTION</span><h2>Что требует внимания</h2></div></header>
        <div className="admin-alert-row"><span className="is-warn" /><div><strong>Платежи не подключены</strong><small>данных от провайдера пока нет</small></div><Link href="/admin/payments">↗</Link></div>
        <div className="admin-alert-row"><span /><div><strong>{data.openConversations} обращения</strong><small>ожидают ответа</small></div><Link href="/admin/support">↗</Link></div>
        <div className="admin-alert-row"><span className={data.nodeStatusAvailable ? "" : "is-warn"} /><div><strong>{data.nodeStatusAvailable ? "Нода отвечает" : "Статус ноды недоступен"}</strong><small>проверка по защищённому SSH-каналу</small></div><Link href="/admin/servers">↗</Link></div>
      </article>
    </section>

    <section className="admin-panel admin-server-overview"><header><div><span className="mono">INFRASTRUCTURE</span><h2>Серверы</h2></div><Link href="/admin/servers">Все серверы ↗</Link></header>
      <div className="admin-server-list">{data.nodes.map((server) => <div key={server.id}><div className="admin-server-name"><i /><strong>REALITY / {server.port}</strong><small>{server.security}</small></div><div><span>CPU</span><strong>—</strong></div><div><span>RAM</span><strong>—</strong></div><div><span>CLIENTS</span><strong>{server.clients}</strong></div><div><span>PING</span><strong>—</strong></div><b>ONLINE</b></div>)}{!data.nodes.length && <p>Статус VPN-ноды пока недоступен.</p>}</div>
    </section>

    <section className="admin-panel admin-recent-payments"><header><div><span className="mono">BILLING</span><h2>Последние платежи</h2></div><Link href="/admin/payments">Все платежи ↗</Link></header><p>Нет подтверждённых платежей: интеграция с платёжным провайдером ещё не настроена.</p></section>
  </>;
}
