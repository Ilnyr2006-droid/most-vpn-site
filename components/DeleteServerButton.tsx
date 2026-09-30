"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteServerButtonProps = { id: string; name: string; disabled: boolean };

export function DeleteServerButton({ id, name, disabled }: DeleteServerButtonProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (disabled || removing) return;
    if (!window.confirm(`Удалить «${name}» из MOST?\n\nЗапись ноды будет удалена из панели. Xray и конфигурация на VPS не изменятся.`)) return;
    setRemoving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/servers/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Не удалось удалить сервер");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить сервер");
    } finally {
      setRemoving(false);
    }
  }

  return <div className="admin-delete-server"><button type="button" onClick={remove} disabled={disabled || removing}>{removing ? "Удаляем…" : "Удалить сервер"}</button>{disabled ? <small>Сначала выведите из подписок</small> : null}{error ? <small className="admin-form-error">{error}</small> : null}</div>;
}
