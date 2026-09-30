import { AdminHeading } from "@/components/AdminShell";
import { AddServerButton } from "@/components/AddServerButton";
import { getAdminData } from "@/lib/admin/data";
import { listRegisteredVpnNodes } from "@/lib/vpn-nodes/repository";

export default async function AdminServersPage() {
  const [{ nodes, nodeStatusAvailable, metrics }, registeredNodes] = await Promise.all([getAdminData(), listRegisteredVpnNodes()]);
  const profiles = nodes.reduce((total, node) => total + node.clients, 0);

  return <>
    <AdminHeading eyebrow="INFRASTRUCTURE" title="Серверы" text="Состояние подключённой VPN-ноды и реестр новых серверов." aside={<AddServerButton />} />
    <section className="admin-server-cards">
      <article className="admin-server-card"><header><div><span className="mono">POLAND / VPN NODE</span><h2>Польша</h2><p>security: reality</p></div><b className={nodeStatusAvailable ? "admin-status is-online" : "admin-status"}><i /> {nodeStatusAvailable ? "ONLINE" : "UNKNOWN"}</b></header>
        <dl className="admin-server-details"><div><dt>Профилей в конфиге</dt><dd>{nodeStatusAvailable ? profiles : "—"}</dd></div><div><dt>CPU</dt><dd>{metrics ? `${metrics.cpuPercent.toFixed(1)}%` : "—"}</dd></div><div><dt>RAM</dt><dd>{metrics ? `${metrics.ramPercent.toFixed(1)}%` : "—"}</dd></div><div><dt>Трафик сейчас</dt><dd>{metrics ? `↓ ${metrics.rxMbps.toFixed(2)} / ↑ ${metrics.txMbps.toFixed(2)} Mbps` : "—"}</dd></div></dl>
        {!nodeStatusAvailable && <p>Проверьте локальный защищённый bridge и SSH-доступ к ноде.</p>}
        <footer><span className="mono">READ-ONLY STATUS · ONE NODE</span></footer>
      </article>
      {registeredNodes.map((node) => <article className="admin-server-card" key={node.id}><header><div><span className="mono">MANUAL NODE</span><h2>{node.name}</h2><p>VPN ещё не подключён</p></div><b className="admin-status">SETUP REQUIRED</b></header><dl className="admin-server-details"><div><dt>Статус</dt><dd>Требуется настройка</dd></div><div><dt>Подписки</dt><dd>Не подключены</dd></div></dl><footer><span className="mono">СМОТРИТЕ ИНСТРУКЦИЮ В «ДОБАВИТЬ СЕРВЕР»</span></footer></article>)}
    </section>
  </>;
}
