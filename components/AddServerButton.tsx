"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AddServerButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/servers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Не удалось добавить сервер");
      setOpen(false);
      setName("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить сервер");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button className="admin-add-server" type="button" onClick={() => setOpen(true)}>Добавить сервер +</button>
    {open && <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => !saving && setOpen(false)}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="add-server-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="admin-modal-close" type="button" onClick={() => setOpen(false)} aria-label="Закрыть">×</button>
      <span className="mono">VPN INFRASTRUCTURE</span><h2 id="add-server-title">Новый сервер</h2>
      <form onSubmit={submit}><label><span>Название сервера</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Германия" maxLength={80} required autoFocus /></label><p className="admin-form-error">{error}</p><button type="submit" disabled={saving}>{saving ? "Добавляем…" : "Добавить в реестр"}</button></form>
      <div className="admin-setup-guide"><h3>Что сделать дальше</h3><ol><li>Создайте VPS с публичным IPv4 и Ubuntu 24.04.</li><li>Настройте Xray: VLESS + Reality, основной и резервный входы.</li><li>Проверьте конфиг и подключение тестовым клиентом.</li><li>Подключите ноду через защищённый provisioning-канал; адреса, SSH-ключи и пароли не вставляйте в эту форму.</li><li>После подключения ноды свяжите provisioning-сервис с оплатой и подписками: выдача и отзыв доступов не должны выполняться вручную в Xray.</li></ol><p>Добавление здесь создаёт только запись в админке — VPN не устанавливается и в подписки автоматически не добавляется.</p></div>
    </section></div>}
  </>;
}
