"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type EnrollmentResult = {
  bootstrapCommand: string;
  enrollmentExpiresAt: string;
};

export function AddServerButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<EnrollmentResult | null>(null);
  const [copied, setCopied] = useState(false);

  function close() {
    if (saving) return;
    setOpen(false);
    setError("");
    setResult(null);
    setCopied(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, countryCode, domain }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Не удалось добавить сервер");
      setResult({ bootstrapCommand: data.bootstrapCommand, enrollmentExpiresAt: data.enrollmentExpiresAt });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить сервер");
    } finally {
      setSaving(false);
    }
  }

  async function copyCommand() {
    if (!result) return;
    await navigator.clipboard.writeText(result.bootstrapCommand);
    setCopied(true);
  }

  return <>
    <button className="admin-add-server" type="button" onClick={() => setOpen(true)}>Добавить сервер +</button>
    {open && <div className="admin-modal-backdrop" role="presentation" onMouseDown={close}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="add-server-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="admin-modal-close" type="button" onClick={close} aria-label="Закрыть">×</button>
      <span className="mono">VPN INFRASTRUCTURE</span><h2 id="add-server-title">Новый сервер</h2>
      {!result ? <form onSubmit={submit}>
        <label><span>Название сервера</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Германия" maxLength={80} required autoFocus /></label>
        <div className="admin-form-row"><label><span>Код страны</span><input value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} placeholder="DE" minLength={2} maxLength={2} pattern="[A-Za-z]{2}" required /></label><label><span>Домен VPN</span><input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="de.vpn.example.com" maxLength={253} required /></label></div>
        <p className="admin-form-error">{error}</p><button type="submit" disabled={saving}>{saving ? "Создаём…" : "Создать подключение"}</button>
      </form> : <div className="admin-enrollment-result">
        <strong>Запись создана. Выполните команду на подготовленном VPS:</strong>
        <textarea readOnly value={result.bootstrapCommand} rows={7} aria-label="Команда подключения сервера" />
        <button type="button" onClick={copyCommand}>{copied ? "Скопировано" : "Скопировать команду"}</button>
        <p>Команда одноразовая и действует до {new Date(result.enrollmentExpiresAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}. После выполнения нода появится со статусом ONLINE.</p>
      </div>}
      <div className="admin-setup-guide"><h3>Перед подключением</h3><ol><li>Создайте VPS с публичным IPv4, Ubuntu 22.04/24.04 и отдельным VPN-доменом.</li><li>Настройте Xray VLESS + Reality и проверьте конфиг командой <code>xray run -test</code>.</li><li>Убедитесь, что сайт MOST доступен серверу по публичному HTTPS-адресу.</li><li>Запустите выданную команду от root. Она проверит SHA-256 bootstrap-скрипта и зарегистрирует агент.</li><li>Не вставляйте SSH-ключи и root-пароли в админку.</li></ol><p>Нода не публикуется клиентам автоматически: сначала должны пройти Xray-проверка и heartbeat.</p></div>
    </section></div>}
  </>;
}
