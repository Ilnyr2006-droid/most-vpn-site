import { SiteHeader } from "@/components/SiteHeader";
import { RouteField } from "@/components/RouteField";
import { NetworkMap } from "@/components/NetworkMap";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { PricingCards } from "@/components/PricingCards";

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="hero section-shell">
        <div className="hero-title-wrap">
          <h1>VPN без<br /><span>лишних настроек.</span></h1>
          <p className="hero-copy">Установите приложение, добавьте доступ и подключайтесь. Сервер подберём автоматически.</p>
        </div>
        <RouteField />
        <div className="hero-bottom">
          <a className="cta" href="#pricing">Подключиться <span>↗</span></a>
          <span className="mono hint">БЫСТРО / ПРОСТО / НА ВСЕХ УСТРОЙСТВАХ</span>
        </div>
      </section>

      <section className="statement section-shell" id="product">
        <div className="statement-grid">
          <h2>Подключение<br />за пару минут.</h2>
          <div className="statement-side">
            <p>Не нужно разбираться в серверах и настройках. После оплаты вы получаете готовый доступ для своего устройства.</p>
            <div className="micro-flow mono"><span>УСТАНОВИТЬ</span><i /> <span>ДОБАВИТЬ</span><i /> <span>ПОДКЛЮЧИТЬ</span><b>●</b></div>
          </div>
        </div>
      </section>

      <section className="how section-shell">
        <div className="flow-grid">
          <article><span className="flow-num mono">01</span><h3>Выберите тариф</h3><p>Месяц или год — без сложных пакетов и дополнительных опций.</p></article>
          <article><span className="flow-num mono">02</span><h3>Установите приложение</h3><p>Подскажем, что установить на iPhone, Android, Windows или Mac.</p></article>
          <article><span className="flow-num mono">03</span><h3>Добавьте доступ</h3><p>Откройте полученную ссылку — настройки добавятся автоматически.</p></article>
          <article><span className="flow-num mono">04</span><h3>Подключитесь</h3><p>Нажмите одну кнопку и пользуйтесь интернетом как обычно.</p></article>
        </div>
      </section>

      <section className="devices section-shell">
        <div className="devices-head"><h2>Телефон, ноутбук<br />и компьютер.</h2><p>Подключайте несколько устройств. Каждое можно отключить отдельно в любой момент.</p></div>
        <div className="device-list">
          <div><span>iPhone</span><div className="device-line"><i style={{ width: "72%" }} /></div><b className="mono"><i className="status-dot" /> ПОДКЛЮЧЕН</b></div>
          <div><span>MacBook</span><div className="device-line"><i style={{ width: "58%" }} /></div><b className="mono"><i className="status-dot" /> ПОДКЛЮЧЕН</b></div>
          <div><span>Windows</span><div className="device-line muted"><i style={{ width: "21%" }} /></div><b className="mono muted-text">○ НЕ В СЕТИ</b></div>
        </div>
      </section>

      <section className="network section-shell">
        <div className="network-title"><h2>Серверы в разных странах.</h2><p>По умолчанию подключаем к подходящему серверу автоматически. При желании страну можно выбрать вручную.</p></div>
        <NetworkMap />
      </section>

      <section className="reliability compact-reliability section-shell">
        <div className="reliability-bar">
          <div><span className="status-dot" /><strong>Резервные серверы</strong></div>
          <p>Если один сервер временно недоступен, подключение можно перевести на другой.</p>
          <span className="mono reliability-status">2+ СЕРВЕРА</span>
        </div>
      </section>

      <section className="pricing section-shell" id="pricing">
        <div className="pricing-head"><h2>Простые тарифы.</h2><p>Без десятка пакетов. Выберите срок подписки — возможности одинаковые.</p></div>
        <PricingCards />
      </section>

      <section className="faq section-shell">
        <h2>Частые вопросы.</h2>
        <FAQ />
      </section>

      <section className="final-cta section-shell">
        <div className="final-route"><span className="final-dot" /><i /><span className="final-dot active" /></div>
        <h2>Попробуйте<br />на своём устройстве.</h2>
        <a className="cta huge" href="#pricing">Подключиться <span>↗</span></a>
      </section>

      <Footer />
    </main>
  );
}
