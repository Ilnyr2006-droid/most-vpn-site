import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="MOST — на главную">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>MOST</span>
      </Link>
      <nav className="nav" aria-label="Основная навигация">
        <Link href="/#product">Как работает</Link>
        <Link href="/pricing">Тарифы</Link>
        <Link href="/download">Установка</Link>
        <Link href="/help">Помощь</Link>
      </nav>
      <div className="header-actions">
        <Link className="text-link" href="/status">Статус</Link>
        <a className="cta-small" href="#pricing">Подключиться <span>↗</span></a>
      </div>
    </header>
  );
}
