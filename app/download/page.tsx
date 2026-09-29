import Link from "next/link";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
const platforms = [["iOS", "iPhone / iPad", "ios"], ["Android", "Телефоны и планшеты", "android"], ["Windows", "Компьютеры", "windows"], ["macOS", "Mac", "macos"], ["Linux", "Компьютеры", "linux"]] as const;
export default function DownloadPage(){return <main><SiteHeader/><section className="inner-hero section-shell"><h1>Подключайте<br/>свои устройства.</h1><p>Для быстрого старта используйте Happ. Ручная настройка тоже доступна.</p></section><section className="platforms section-shell">{platforms.map(([name, subtitle, slug], i)=><article key={slug}><span className="mono">0{i+1}</span><h2>{name}</h2><p>{subtitle}<br/>Рекомендуем: через Happ.</p><div className="platform-actions"><Link href={`/help/${slug}/happ`}>Через Happ ↗</Link><Link href={`/help/${slug}/manual`}>Вручную ↗</Link></div></article>)}</section><Footer/></main>}
