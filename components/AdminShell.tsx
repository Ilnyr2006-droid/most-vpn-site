import Link from "next/link";
import { ReactNode } from "react";
import { AdminNav } from "@/components/AdminNav";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <Link className="admin-brand" href="/admin">
            <span>MOST</span>
            <small className="mono">ADMIN</small>
          </Link>
          <AdminNav />
        </div>

        <div className="admin-sidebar-bottom">
          <Link href="/">Открыть сайт ↗</Link>
          <AdminLogoutButton />
        </div>
      </aside>

      <div className="admin-mobile">
        <Link href="/admin">MOST <small>ADMIN</small></Link>
        <details>
          <summary>Меню</summary>
          <AdminNav />
        </details>
      </div>

      <section className="admin-content">{children}</section>
    </main>
  );
}

export function AdminHeading({
  eyebrow,
  title,
  text,
  aside,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="admin-heading">
      <div>
        <span className="mono">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {aside && <div className="admin-heading-aside">{aside}</div>}
    </header>
  );
}
