import { AdminHeading } from "@/components/AdminShell";
import { getAdminData } from "@/lib/admin/data";

export default async function AdminServersPage() {
  const { nodes, nodeStatusAvailable } = await getAdminData();
  return <>
    <AdminHeading eyebrow="INFRASTRUCTURE" title="Серверы" text="Статус активных VPN-входов с подключённой ноды." />
    <section className="admin-server-cards">
      {nodes.map((node) => <article key={node.id} className="admin-server-card"><header><div><span className="mono">{node.id}</span><h2>REALITY / {node.port}</h2><p>security: {node.security}</p></div><b className="admin-status is-online"><i /> ONLINE</b></header><dl className="admin-server-details"><div><dt>Активных клиентов</dt><dd>{node.clients}</dd></div><div><dt>CPU</dt><dd>—</dd></div><div><dt>RAM</dt><dd>—</dd></div><div><dt>Трафик</dt><dd>—</dd></div></dl><footer><span className="mono">READ-ONLY STATUS</span></footer></article>)}
      {!nodes.length && <article className="admin-server-card"><header><div><span className="mono">VPN NODE</span><h2>Статус недоступен</h2><p>{nodeStatusAvailable ? "Нет активных входов." : "Проверьте локальный защищённый bridge и SSH-доступ."}</p></div><b className="admin-status"><i /> UNKNOWN</b></header></article>}
    </section>
  </>;
}
