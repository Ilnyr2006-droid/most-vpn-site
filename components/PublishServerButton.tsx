"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishServerButton({ id, name, published, ready }: { id: string; name: string; published: boolean; ready: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function update() {
    if (saving || (!published && !ready)) return;
    const next = !published;
    if (!window.confirm(next ? `Добавить «${name}» в выдачу новых VPN-доступов?` : `Остановить выдачу новых VPN-доступов через «${name}»?`)) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/servers/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: next }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Не удалось изменить выдачу");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось изменить выдачу"); }
    finally { setSaving(false); }
  }
  return <div className="admin-publish-server"><button type="button" onClick={update} disabled={saving || (!published && !ready)}>{saving ? "Сохраняем…" : published ? "Остановить выдачу" : "Включить выдачу"}</button>{!published && !ready ? <small>Дождитесь ONLINE и heartbeat</small> : null}{error ? <small className="admin-form-error">{error}</small> : null}</div>;
}
