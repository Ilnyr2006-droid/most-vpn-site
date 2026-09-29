"use client";
import { useRouter } from "next/navigation";
export function LogoutButton() { const router = useRouter(); return <button className="account-logout" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/auth"); router.refresh(); }}>Выйти</button>; }
