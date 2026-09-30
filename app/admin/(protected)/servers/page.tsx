import { AdminHeading } from "@/components/AdminShell";
import { AddServerButton } from "@/components/AddServerButton";
import { DeleteServerButton } from "@/components/DeleteServerButton";
import { PublishServerButton } from "@/components/PublishServerButton";
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
      {registeredNodes.map((node) => <article className="admin-server-card" key={node.id}><header><div><span className="mono">{node.countryCode} / MANAGED NODE</span><h2>{node.name}</h2><p>{node.domain || "Домен не задан"}</p></div><b className={node.status === "ONLINE" ? "admin-status is-online" : "admin-status"}><i /> {node.status}</b></header><dl className="admin-server-details"><div><dt>Агент</dt><dd>{node.agentVersion ? `v${node.agentVersion}` : "Не подключён"}</dd></div><div><dt>Последняя связь</dt><dd>{node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleString("ru-RU") : "—"}</dd></div><div><dt>VPN-входы</dt><dd>{node.endpoints.length}</dd></div><div><dt>Подписки</dt><dd>{node.published ? "Опубликован" : "Не опубликован"}</dd></div></dl><footer><span className="mono">{node.status === "SETUP_REQUIRED" ? "ВЫПОЛНИТЕ ОДНОРАЗОВУЮ КОМАНДУ ПОДКЛЮЧЕНИЯ" : "ПРИВАТНЫЙ КЛЮЧ REALITY ХРАНИТСЯ ТОЛЬКО НА НОДЕ"}</span><div><PublishServerButton id={node.id} name={node.name} published={node.published} ready={node.status === "ONLINE" && node.endpoints.length > 0} /><DeleteServerButton id={node.id} name={node.name} disabled={node.published} /></div></footer></article>)}
    </section>
  </>;
}
