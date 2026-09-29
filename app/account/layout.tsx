import { AccountShell } from "@/components/AccountShell";
import { requireSession } from "@/lib/auth/session";
export default async function AccountLayout({ children }: { children: React.ReactNode }) { await requireSession(); return <AccountShell>{children}</AccountShell>; }
