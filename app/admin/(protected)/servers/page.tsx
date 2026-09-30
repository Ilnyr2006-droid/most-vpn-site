import { AdminHeading } from "@/components/AdminShell";
import { getAdminData } from "@/lib/admin/data";

export default async function AdminServersPage() {
  const { nodes, nodeStatusAvailable } = await getAdminData();
  const profiles = nodes.reduce((total, node) => total + node.clients, 0);

  return <>
    <AdminHeading eyebrow="INFRASTRUCTURE" title="Сервер" text="Одна VPN-нода с основным и резервным вариантами подключения." />
    <section className="admin-server-cards">
      <article className="admin-server-card"><header><div><span className="mono">VPN NODE</span><h2>VPN-сервер</h2><p>{nodeStatusAvailable ? `${nodes.length} варианта подключения · ${profiles} профилей в конфиге` : "Статус ноды недоступен"}</p></div><b className={nodeStatusAvailable ? "admin-status is-online" : "admin-status"}><i /> {nodeStatusAvailable ? "ONLINE" : "UNKNOWN"}</b></header>
        {nodes.length > 0 && <dl className="admin-server-details">{nodes.map((node) => <div key={node.id}><dt><strong>{node.role} · {node.port}</strong><small>{node.protocol}</small><small>{node.note}</small></dt><dd>{node.clients} профилей</dd></div>)}</dl>}
        {!nodes.length && <p>Проверьте локальный защищённый bridge и SSH-доступ к ноде.</p>}
        <footer><span className="mono">READ-ONLY STATUS · ONE NODE</span></footer>
      </article>
    </section>
  </>;
}
