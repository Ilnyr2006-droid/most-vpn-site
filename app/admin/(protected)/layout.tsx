import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { getAdminSession } from "@/lib/admin/session";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return <AdminShell>{children}</AdminShell>;
}
