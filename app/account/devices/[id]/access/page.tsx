import Link from "next/link";
import { AccountHeading } from "@/components/AccountShell";
import { requireSession } from "@/lib/auth/session";
import { getDeviceManualConfig, getDeviceSubscriptionUrl, ProvisioningError } from "@/lib/provisioning/service";

export default async function DeviceAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  const { id } = await params;
  let config: string | null = null, subscriptionUrl: string | null = null;
  try { [config, subscriptionUrl] = await Promise.all([getDeviceManualConfig(user.id, id), getDeviceSubscriptionUrl(user.id, id)]); } catch (error) { if (!(error instanceof ProvisioningError)) throw error; }
  return <><AccountHeading title="Доступ устройства." text={config ? "Персональная подписка содержит все доступные VPN-ноды." : "Ноды ещё готовят доступ. Обновите страницу примерно через минуту."} /><section className="subscription-card"><span className="mono">{config ? "ПЕРСОНАЛЬНАЯ ПОДПИСКА" : "ПОДГОТОВКА ДОСТУПА"}</span>{config && subscriptionUrl ? <><h2>VLESS Reality</h2><p>Добавьте ссылку-подписку в Happ или другой поддерживаемый клиент. В ней автоматически появятся новые ноды и исчезнут выведенные.</p><code className="device-config">{subscriptionUrl}</code><p>Резервная прямая ссылка:</p><code className="device-config">{config}</code></> : <p>Если статус не меняется, проверьте, что VPN-нода находится ONLINE и публикуется в выдаче.</p>}<Link className="cta" href="/account/devices">К устройствам <span>↗</span></Link></section></>;
}
