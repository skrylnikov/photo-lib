## Why

Production web runtime возвращает HTTP 404 при прямом открытии клиентских маршрутов `/admin` и `/album/:slug`, хотя переходы внутри уже загруженного React-приложения работают. Из-за этого ломаются сохранённые ссылки, обновление страницы и возврат из Pocket ID на `/admin`.

## What Changes

- Включить штатный SPA fallback статического web-сервера, чтобы клиентские маршруты получали `index.html` и обрабатывались React-приложением.
- Сохранить существующее проксирование `/trpc`, `/media` и `/auth` в API без подмены их ответов SPA fallback-страницей.
- Проверить прямое открытие `/admin`, публичного `/album/:slug` и существующих API/health-маршрутов в production-подобном runtime.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `library-runtime-foundation`: web runtime должен поддерживать прямое открытие клиентских SPA-маршрутов, не меняя маршрутизацию backend endpoints.

## Impact

- `apps/share-web/Dockerfile`: параметры запуска уже используемого `reproxy`.
- Production web container и его smoke-проверки.
- Новые зависимости, API-контракты и миграции данных не требуются.
