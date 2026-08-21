## Why

Текущий share-сервис выводит плоский список изображений без авторизации и опирается на PostgreSQL, Redis/BullMQ, Telegram-бота и локальную директорию оригиналов. Он не позволяет курировать публичную фотобиблиотеку по альбомам и безопасно управлять ею из веба.

Изменение заново собирает продукт как однорепличную self-hosted фотобиблиотеку: публичный сайт, приватная веб-админка, долговечные локальные метаданные и объектное хранилище RustFS.

## What Changes

- **BREAKING** Заменить плоский публичный Image API и прямую выдачу оригиналов альбомами, избранными фото и контролируемыми media derivatives.
- Добавить публичный интерфейс альбомов: главная группирует избранные фото опубликованных альбомов, а страница альбома показывает все его фотографии.
- Добавить защищённую веб-админку `/admin` для загрузки, организации, сортировки, выделения и публикации альбомов и медиа; убрать Telegram-бот как поверхность администрирования.
- Добавить авторизацию Pocket ID OIDC с непрозрачными server-side сессиями для всех административных операций.
- **BREAKING** Перенести source of truth медиа с локальной файловой системы в приватный bucket RustFS через `s3mini`; оставить локальными только ограниченный кэш derivatives и временную рабочую область.
- Заменить Redis/BullMQ долговечной очередью на SQLite внутри API-процесса. Обработка изображений идёт последовательно через Sharp/libvips без Node `worker_thread`.
- Поддержать оригиналы JPEG, PNG, WebP, AVIF, JXL, HEIF и HEIC, создавать immutable HEIC derivatives через HEVC и отдавать браузеру responsive JXL, AVIF, HEIC, WebP и JPEG fallback через нативный выбор формата.
- Заменить Effector, Emotion и Linaria на Nano Stores, Mantine и Vanilla Extract как основу фронтенда.
- Сохранить tRPC для типизированных metadata и admin API; применять защищённый streaming upload endpoint для бинарных загрузок.

## Capabilities

### New Capabilities

- `public-album-gallery`: публично показывать избранные фотографии, сгруппированные по опубликованным альбомам, и все фото открытого опубликованного альбома.
- `admin-library-management`: позволять авторизованному администратору загружать медиа, управлять альбомами, составом, порядком, избранностью и публикацией.
- `oidc-admin-access`: аутентифицировать и авторизовывать приватную админку через Pocket ID OIDC и безопасные server-side сессии.
- `object-media-storage`: хранить оригиналы и immutable derivatives в приватном RustFS, с локальным кэшированием и контролируемой выдачей.
- `media-processing`: валидировать современные форматы изображений и создавать responsive browser derivatives в рамках долговечных последовательных задач.
- `library-runtime-foundation`: определить SQLite, tRPC, Nano Stores, Mantine и Vanilla Extract runtime boundaries, заменяющие legacy-стек.

### Modified Capabilities

<!-- Нет. В репозитории отсутствуют существующие OpenSpec capability specifications. -->

## Impact

- Затронутые приложения: `apps/share-api` и `apps/share-web`; необходимость legacy-пакетов thumbnails, UI, config и shared types будет пересмотрена в реализации.
- Затронутое хранилище состояния: PostgreSQL-схема и Redis заменяются SQLite-метаданными, сессиями и долговечными задачами.
- Затронутые интеграции: удаляются grammY/Telegram; добавляются Pocket ID OIDC, конфигурация RustFS и `s3mini`.
- Затронутый деплой: нужны приватный RustFS bucket, ограниченные writable cache/tmp volumes, OIDC credentials и custom libvips build с JXL и HEIF/HEIC.
