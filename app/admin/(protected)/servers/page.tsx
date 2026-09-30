import { AdminHeading } from "@/components/AdminShell";
import { getAdminData } from "@/lib/admin/data";

export default async function AdminServersPage() {
  const { nodes, nodeStatusAvailable } = await getAdminData();
  const profiles = nodes.reduce((total, node) => total + node.clients, 0);

  return <>
    <AdminHeading eyebrow="INFRASTRUCTURE" title="Сервер" text="Состояние подключённой VPN-ноды." />
    <section className="admin-server-cards">
      <article className="admin-server-card"><header><div><span className="mono">VPN NODE</span><h2>VPN-сервер</h2><p>security: reality</p></div><b className={nodeStatusAvailable ? "admin-status is-online" : "admin-status"}><i /> {nodeStatusAvailable ? "ONLINE" : "UNKNOWN"}</b></header>
        <dl className="admin-server-details"><div><dt>Активных клиентов</dt><dd>{nodeStatusAvailable ? profiles : "—"}</dd></div><div><dt>CPU</dt><dd>—</dd></div><div><dt>RAM</dt><dd>—</dd></div><div><dt>Трафик</dt><dd>—</dd></div></dl>
        {!nodeStatusAvailable && <p>Проверьте локальный защищённый bridge и SSH-доступ к ноде.</p>}
        <footer><span className="mono">READ-ONLY STATUS · ONE NODE</span></footer>
      </article>
    </section>
  </>;
}
