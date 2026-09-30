import { AdminHeading } from "@/components/AdminShell";
import { SupportInbox } from "@/components/SupportInbox";

export default function AdminSupportPage() {
  return (
    <div className="admin-support-page">
      <AdminHeading eyebrow="SUPPORT" title="Поддержка" text="Все обращения с сайта и ответы клиентам." />
      <SupportInbox />
    </div>
  );
}
