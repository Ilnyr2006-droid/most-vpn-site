import { AdminHeading } from "@/components/AdminShell";

export default function AdminPaymentsPage() {
  return <>
    <AdminHeading eyebrow="BILLING" title="Платежи" text="Подтверждённые платежи появятся здесь после подключения провайдера и webhook-проверки." />
    <section className="admin-traffic-summary"><article><span className="mono">УСПЕШНО</span><strong>—</strong><small>нет источника данных</small></article><article><span className="mono">ОПЛАТ</span><strong>—</strong><small>нет источника данных</small></article><article><span className="mono">ОШИБКИ</span><strong>—</strong><small>нет источника данных</small></article></section>
    <section className="admin-panel admin-payments-table"><p>Платёжный провайдер ещё не подключён. Исторические и тестовые платежи намеренно не показываются как реальные.</p></section>
  </>;
}
