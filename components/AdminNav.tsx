"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Обзор", "/admin"],
  ["Серверы", "/admin/servers"],
  ["Клиенты", "/admin/clients"],
  ["Трафик", "/admin/traffic"],
  ["Платежи", "/admin/payments"],
  ["Поддержка", "/admin/support"],
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      {links.map(([label, href]) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? "is-active" : ""}>
            <span>{label}</span>
            <i aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}
