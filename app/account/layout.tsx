import { AccountShell } from "@/components/AccountShell";
// TODO(production): protect every /account/* route with a server-side session guard before enabling payments.
export default function AccountLayout({ children }: { children: React.ReactNode }) { return <AccountShell>{children}</AccountShell>; }
