# MOST

Сайт VPN-сервиса на Next.js и TypeScript.

## Локальный запуск

```bash
npm install
npm run dev
```

Сайт откроется на `http://localhost:3000`.

## Основные маршруты

- `/` — главная
- `/pricing` — тарифы
- `/checkout?plan=monthly` — оформление
- `/download` — установка
- `/help` — помощь
- `/status` — статус сервисов
- `/privacy` — конфиденциальность
- `/terms` — условия

## Перед публикацией

1. Скопировать `.env.example` в `.env.local` и указать рабочий домен.
2. Подтвердить цены, локации и лимит устройств в `lib/plans.ts`.
3. Подключить оплату по инструкции `PAYMENTS.md`.
4. Указать оператора сервиса и контакты в юридических документах.
5. Добавить рабочий канал поддержки и реальные ссылки на приложения.
6. Подключить страницу статуса к health API.
7. Запустить `npm run db:migrate`, задать `CREDENTIAL_ENCRYPTION_KEY` и `PROVISIONING_CRON_SECRET`.
8. Вызывать `POST /api/internal/provisioning/reconcile` с `Authorization: Bearer $PROVISIONING_CRON_SECRET` каждые 1–5 минут: он ставит отзыв просроченных VPN-доступов в очередь нод.

## Локальный тестовый пользователь

Для локальной разработки можно создать обычного тестового пользователя через `.env.local` (этот файл не коммитится):

```env
DEV_SEED_USER=true
DEV_SEED_PHONE=+79999999999
```

Seed работает только вне production. Пользователь входит через обычный mock SMS flow.
