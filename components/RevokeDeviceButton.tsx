"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeDeviceButton({ deviceId, name }: { deviceId: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function revoke() {
    if (pending || !window.confirm(`Отключить «${name}»? На этом устройстве VPN перестанет работать после подтверждения нодой.`)) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/account/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Не удалось отключить устройство");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось отключить устройство"); }
    finally { setPending(false); }
  }
  return <><button type="button" onClick={revoke} disabled={pending}>{pending ? "Отключаем…" : "Отключить"}</button>{error ? <small className="device-action-error">{error}</small> : null}</>;
}
