import Link from "next/link";
import { AccountHeading } from "@/components/AccountShell";
export default function SubscriptionPage() { return <><AccountHeading title="Подписка." text="Доступ активен до 29 октября 2026 года." /><article className="subscription-card"><span className="mono">АКТИВНА</span><h2>299 ₽ <small>/ месяц</small></h2><p>До 3 устройств · 3 локации · поддержка в Telegram</p><Link className="cta" href="/pricing">Продлить <span>↗</span></Link></article></>; }
