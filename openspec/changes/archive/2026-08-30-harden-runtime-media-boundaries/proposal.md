## Why

Текущий dev runtime по умолчанию открывает административный доступ и RustFS на всех сетевых интерфейсах, а Docker context может включить локальные секреты и рабочие SQLite-файлы. Одновременно публичная media delivery допускает сохранение частичного Range-ответа как полного объекта, а ошибка инфраструктуры может навсегда остановить встроенный job runner при формально успешном health check.

## What Changes

- Сделать development auth bypass явным opt-in и ограничить опубликованные dev-порты loopback-интерфейсом.
- Исключить `.env`, SQLite/WAL/SHM, cache indexes и другие runtime-данные из Git и Docker build context; production image не должен содержать локальные credentials или пользовательские metadata.
- **BREAKING**: локальные admin-запросы без Pocket ID больше не получают автоматическую сессию только из-за `NODE_ENV=development`; bypass требует отдельной настройки.
- Не кешировать частичные object-store ответы как полный derivative; до появления корректного end-to-end Range-контракта media route возвращает и кеширует только полный объект.
- Убрать запись общего cache index из каждого cache hit и исключить глобальную сериализацию независимых чтений.
- Использовать все доступные размеры derivative в responsive `srcset`, чтобы gallery thumbnails не загружали вариант 2560 px без необходимости.
- Гарантировать продолжение job loop после инфраструктурной ошибки и отражать обязательные codec capabilities в readiness.
- Добавить регрессионные проверки для auth bypass, Docker context, media cache/Range, responsive selection, runner recovery и readiness.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `library-runtime-foundation`: runtime и container artifacts не содержат локальные секреты или рабочие данные, а dev-сервисы не публикуют привилегированные порты во внешнюю сеть по умолчанию.
- `oidc-admin-access`: development auth bypass становится явным и ограниченным opt-in-механизмом вместо неявного следствия `NODE_ENV=development`.
- `object-media-storage`: локальный derivative cache сохраняет только полные объекты и не сериализует независимые cache hits через синхронное обновление общего индекса.
- `media-processing`: job runner продолжает цикл после временных инфраструктурных ошибок, а readiness сообщает о недоступных обязательных codecs.
- `public-album-gallery`: браузер получает responsive `srcset` и выбирает derivative, соответствующий фактическому размеру кадра.

## Impact

- Затрагиваются `compose-dev.yaml`, `.dockerignore`, `.gitignore`, tracked runtime artifacts и `apps/share-api/Dockerfile`.
- Изменяются development auth/session configuration, media route, локальный cache, health/readiness и job runner.
- Изменяется формирование `<picture>` в `share-web`; публичные URL derivatives и порядок fallback-форматов остаются совместимыми.
- Новые внешние сервисы и зависимости не требуются; SQLite, RustFS, Fastify/tRPC и однопроцессный runner сохраняются.
- Viewer animation, admin pagination, форматная матрица derivatives и production deployment не входят в scope change.
