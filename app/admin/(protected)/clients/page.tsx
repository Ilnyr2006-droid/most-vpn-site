import { AdminHeading } from "@/components/AdminShell";
import { getAdminData } from "@/lib/admin/data";

export default async function AdminClientsPage() {
  const { clients } = await getAdminData();
  return <>
    <AdminHeading eyebrow="CUSTOMERS" title="Клиенты" text="Реестр пользователей, прошедших вход по номеру." />
    <div className="admin-toolbar"><span>Подписки, устройства и VPN-доступы появятся после подключения provisioning-сервиса.</span><span>{clients.length} записей</span></div>
    <section className="admin-panel admin-clients-table"><div className="admin-table admin-table-clients"><div className="admin-table-head"><span>Клиент</span><span>Подтверждён</span><span>Подписка</span><span>Устройства</span><span>Сервер</span><span>Трафик</span><span>Создан</span></div>
      {clients.map((client) => <div className="admin-table-row" key={client.id}><div><strong>{client.phone}</strong><small>{client.id}</small></div><b className="is-ok">ДА</b><span>не подключена</span><span>—</span><span>—</span><strong>—</strong><span>{new Intl.DateTimeFormat("ru-RU").format(new Date(client.createdAt))}</span></div>)}
      {!clients.length && <p>Пользователи появятся здесь после первого входа по номеру.</p>}
    </div></section>
  </>;
}
