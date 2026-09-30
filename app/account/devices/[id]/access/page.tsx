import Link from "next/link";
import { AccountHeading } from "@/components/AccountShell";
import { requireSession } from "@/lib/auth/session";
import { getDeviceManualConfig, ProvisioningError } from "@/lib/provisioning/service";

export default async function DeviceAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  const { id } = await params;
  let config: string | null = null;
  try { config = await getDeviceManualConfig(user.id, id); } catch (error) { if (!(error instanceof ProvisioningError)) throw error; }
  return <><AccountHeading title="Доступ устройства." text={config ? "Это персональная ссылка для выбранного устройства." : "Нода ещё готовит доступ. Обновите страницу примерно через минуту."} /><section className="subscription-card"><span className="mono">{config ? "ПЕРСОНАЛЬНЫЙ ДОСТУП" : "ПОДГОТОВКА ДОСТУПА"}</span>{config ? <><h2>VLESS Reality</h2><p>Добавьте ссылку в Happ или другой поддерживаемый клиент. Не передавайте её другим людям.</p><code className="device-config">{config}</code></> : <p>Если статус не меняется, проверьте, что VPN-нода находится ONLINE и публикуется в выдаче.</p>}<Link className="cta" href="/account/devices">К устройствам <span>↗</span></Link></section></>;
}
