"use client";
import Link from "next/link";
import { useState } from "react";
import { AccountHeading } from "@/components/AccountShell";
const platforms = [["iOS", "ios"], ["Android", "android"], ["Windows", "windows"], ["macOS", "macos"], ["Linux", "linux"]] as const;
type PlatformSlug = (typeof platforms)[number][1];
export default function ConnectPage() { const [platform, setPlatform] = useState<PlatformSlug>("ios"); return <><AccountHeading title="Подключить устройство." text="Выберите устройство и способ настройки." /><div className="connect-steps"><section><span className="mono">01 / УСТРОЙСТВО</span><div className="platform-picker">{platforms.map(([name, slug]) => <button type="button" key={slug} className={platform === slug ? "is-selected" : ""} onClick={() => setPlatform(slug)} aria-pressed={platform === slug}>{name}</button>)}</div></section><section><span className="mono">02 / СПОСОБ</span><div><Link className="connect-primary" href={`/help/${platform}/happ`}>Через Happ ↗</Link><Link href={`/help/${platform}/manual`}>Вручную ↗</Link></div></section><section><span className="mono">03 / ДОСТУП</span><p>После выбора мы покажем ссылку или QR-код для подключения.</p></section></div></>; }
