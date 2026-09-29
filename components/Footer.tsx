import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <span className="brand">MOST</span>
        <p>Простой VPN-сервис для телефона и компьютера.</p>
      </div>
      <div className="footer-links">
        <div><span className="mono">РАЗДЕЛЫ</span><Link href="/pricing">Тарифы</Link><Link href="/download">Установка</Link><Link href="/help">Помощь</Link><Link href="/status">Статус</Link><Link href="/account">Личный кабинет</Link></div>
        <div><span className="mono">ДОКУМЕНТЫ</span><Link href="/privacy">Конфиденциальность</Link><Link href="/terms">Условия</Link></div>
      </div>
      <div className="footer-bottom mono"><span>© 2026 MOST</span><span></span></div>
    </footer>
  );
}
