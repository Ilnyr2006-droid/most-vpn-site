import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getAdminSession } from "@/lib/admin/session";

export default async function AdminLoginPage() {
  const current = await getAdminSession();
  if (current) redirect("/admin");

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-brand">
          <strong>MOST</strong>
          <span className="mono">ADMIN</span>
        </div>

        <div className="admin-login-copy">
          <span className="mono">CONTROL PANEL</span>
          <h1>Вход.</h1>
          <p>Панель управления серверами, клиентами и поддержкой.</p>
        </div>

        <AdminLoginForm />
      </section>
    </main>
  );
}
