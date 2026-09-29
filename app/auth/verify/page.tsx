import { VerifyForm } from "@/components/AuthForms";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ challenge?: string; phone?: string }> }) { const params = await searchParams; return <main><SiteHeader /><section className="auth-page section-shell"><span className="mono">ПОДТВЕРЖДЕНИЕ</span><h1>Введите код</h1><p>Код состоит из шести цифр.</p><VerifyForm challengeId={params.challenge ?? ""} phone={params.phone ?? ""} /></section><Footer /></main>; }
