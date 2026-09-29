import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import Link from "next/link";
const platforms = [["iOS", "iPhone / iPad", "01"], ["Android", "Phone / Tablet", "02"], ["Windows", "Windows 10 / 11", "03"], ["macOS", "Apple Silicon / Intel", "04"], ["Linux", "Desktop", "05"]];
export default function DownloadPage() { return <main><SiteHeader /><section className="inner-hero section-shell"><h1>Ваше устройство.<br />Три шага до сети.</h1><p>После оформления вы получите ссылку на подходящее приложение и персональную инструкцию по добавлению доступа.</p></section><section className="platforms section-shell">{platforms.map(([name, sub, n]) => <article key={name}><span className="mono">{n}</span><h2>{name}</h2><p>{sub}</p><Link href="/help">Как подключиться ↗</Link></article>)}</section><Footer /></main> }
