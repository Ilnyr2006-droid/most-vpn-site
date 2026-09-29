import { PhoneForm } from "@/components/AuthForms";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
export default function AuthPage() { return <main><SiteHeader /><section className="auth-page section-shell"><span className="mono">ВХОД</span><h1>Войти в MOST</h1><p>Введите номер телефона. Мы отправим код для входа.</p><PhoneForm /></section><Footer /></main>; }
