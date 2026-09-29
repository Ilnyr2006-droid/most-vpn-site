import { AccountHeading } from "@/components/AccountShell";
import { mockUser } from "@/lib/mock-service";
export default function SettingsPage() { return <><AccountHeading title="Настройки." text="Данные для восстановления доступа и сервисных сообщений." /><div className="settings-list"><div><span>Email</span><strong>{mockUser.email}</strong><button disabled title="Скоро будет доступно">Изменить · скоро</button></div><div><span>Сессии</span><strong>1 активная сессия</strong><button disabled title="Скоро будет доступно">Выйти везде · скоро</button></div></div></>; }
