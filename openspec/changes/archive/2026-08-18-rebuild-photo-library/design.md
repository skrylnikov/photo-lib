## Context

Мотивация изложена в [proposal.md](proposal.md). Текущий workspace из двух приложений содержит плоский публичный tRPC image list, PostgreSQL-метаданные, Redis/BullMQ для thumbnail-задач, локальные оригиналы и опциональный Telegram-бот. В нём нет модели альбомов, границы публикации или авторизации владельца. В рабочем дереве также есть посторонняя незакоммиченная модернизация runtime/dependencies; это изменение не должно предполагать её отмену или молча перезаписывать её.

## Goals / Non-Goals

**Goals:**

- Предоставить однорепличную фотобиблиотеку с явными публичными, приватными, storage и processing границами.
- Сделать RustFS долговечным источником медиа, строго ограничив использование локального диска.
- Сделать загрузку и обработку надёжными при обычных рестартах без Redis и Node worker thread.
- Предлагать современные display-форматы через нативный выбор браузера, сохраняя совместимый fallback.

**Non-Goals:**

- Несколько реплик, совместная многопользовательская работа, публичные share-links, API для внешних разработчиков, видеообработка, AI-классификация, распознавание лиц и нативный мобильный клиент.
- Использование локального кэша как офлайн-реплики или backup RustFS.
- In-place миграция legacy PostgreSQL-схемы: модель данных продукта намеренно заменяется.

## Decisions

### Один API-процесс, SQLite и долговечный in-process job runner

Развёртывание имеет одну API-реплику. SQLite на persistent local volume хранит альбомы, метаданные медиа, derivatives, сессии, upload intents и jobs. Включаются WAL, foreign keys и ограниченный busy timeout; write transactions остаются короткими.

API-процесс выполняет последовательный асинхронный job loop. Он захватывает одну задачу с lease, выполняет I/O и image work, затем фиксирует terminal или retryable result. При старте он восстанавливает lease с истёкшим сроком. Отдельный Node `worker_thread` пока отклонён: Sharp уже ставит работу в libuv, а libvips использует собственный native thread pool; второй JavaScript isolate добавил бы сложность lifecycle и SQLite connections, но не дал бы отдельное CPU-ядро.

PostgreSQL и распределённая очередь откладываются до появления нескольких writers или реплик.

### Курация отделена от immutable media objects

Используются записи `Album`, `MediaAsset`, `AlbumMedia`, `Derivative`, `UploadIntent`, `MediaJob` и `AdminSession`. `AlbumMedia` владеет заданными куратором позицией и флагом избранности; только опубликованный альбом делает назначенные ему готовые медиа публичными. `MediaAsset` хранит метаданные оригинала и непрозрачную идентичность объекта, но не пригодный для внешнего использования storage pathname.

Операция публикации альбома валидирует, что у каждого назначенного элемента есть обязательный готовый display set. Снятие с публикации немедленно запрещает новые публичные metadata и media requests.

### Приватный RustFS через узкий адаптер s3mini

Создаётся server-only abstraction `ObjectStore` на закреплённом `s3mini`, настроенном endpoint, bucket, credentials и path-style RustFS. Адаптер владеет object keys, presigned upload URLs, проверкой существования объекта, streaming reads и безопасным удалением неиспользуемых объектов. Никакой слой за его пределами не получает storage credentials и не конструирует raw object URLs.

Браузер загружает файл по короткоживущему presigned PUT URL для одного ключа. API проверяет завершённый объект и связывает его с upload intent до постановки задачи. Так крупные файлы не проходят через Fastify, но ownership и lifecycle остаются контролируемыми.

### Локально кэшируются только контролируемые derivatives

Приложение выдаёт derivatives по контролируемым application URLs после проверки текущего состояния публикации. Content-addressed cache с atomic writes хранит выбранные derivative reads; index отслеживает размер и последний доступ. На high-water mark он вытесняет LRU-записи до нижней цели. Оригиналы скачиваются только во временную ограниченную директорию на время обработки и после неё удаляются.

Публичные RustFS objects и локальная директория как source of truth отклонены: первое обошло бы publication controls, второе превратило бы кэш во второе хранилище.

### Современные оригиналы сохраняются, а viewer договаривается о формате через picture

После decoder validation оригинал хранится без изменений. Processor создаёт immutable derivatives по ширине и формату: JXL, AVIF, HEIC через HEVC, WebP и JPEG. React рендерит их через `picture` в порядке JXL → AVIF → HEIC → WebP → JPEG: браузер выбирает поддерживаемый результат без хрупкого User-Agent или `Accept` inference на сервере.

Поддержка JXL и HEIF/HEIC требует custom libvips image с libjxl, libheif и нужными HEVC codecs. Startup и CI проверяют реально доступные decoder/encoder до приёма этих форматов. Выполняется только одна задача за раз, а Sharp/libvips concurrency ограничивается, чтобы кодирование AVIF/JXL не занимало все CPU.

### Одно веб-приложение и типизированная API-граница

Одно React/Vite-приложение владеет анонимными маршрутами и `/admin`; публичная навигация не раскрывает admin route. Mantine предоставляет компоненты, Vanilla Extract — custom styles и theme tokens. Nano Stores хранят клиентское UI state: lightbox, route-local selection и статус мутаций.

tRPC остаётся типизированным API для публичных queries и admin mutations. Защищённый Fastify streaming upload endpoint — намеренное исключение, потому что крупный бинарный transfer не подходит JSON RPC. Web-клиент не импортирует server implementation code, кроме явного shared contract surface.

### Server-side авторизация через Pocket ID OIDC

Используется Authorization Code flow с state, nonce, PKCE, discovery, проверкой issuer/audience/signature и allowlist настроенных subjects или groups. После проверки создаётся хэшированная opaque session в SQLite и устанавливается secure HTTP-only same-site cookie. tRPC admin middleware и upload endpoint загружают эту сессию; client routing не является авторизационной границей.

### Legacy surfaces удаляются, а не сохраняются параллельно

Удаляются grammY/Telegram, PostgreSQL, Redis, BullMQ, direct file serving, public reindexing, flat image procedure, Effector, Emotion и Linaria. Legacy-проект не является compatibility layer для новой галереи.

## Risks / Trade-offs

- [SQLite не может безопасно обслуживать несколько независимых writers/replicas] → развёртывать ровно один API-процесс и мигрировать координацию storage/queue до масштабирования.
- [Недоступность RustFS или оборванный presigned upload оставляют незавершённые objects] → проверять upload intents, держать объекты приватными, повторять transient job errors и удалять просроченные непривязанные uploads.
- [Поддержка JXL/HEIF/HEIC меняется в зависимости от сборки libvips] → собирать custom image, проверять форматы на startup и в CI, отклонять неподдерживаемый input до публикации.
- [JXL/AVIF encoding требует много CPU] → сериализовать jobs, ограничить Sharp concurrency/cache, ограничить tmp space и показывать прогресс вместо блокировки admin request.
- [Долгоживущие browser/local cache могут отложить изменение видимости] → выдавать derivatives через приложение и использовать immutable keys только для revision, который остаётся авторизованным в текущем состоянии.
- [Небольшой s3mini может обнаружить пробелы совместимости с RustFS] → скрыть его за `ObjectStore` и выполнить RustFS integration tests обязательных операций до production uploads.
- [Legacy worktree уже грязный] → stage и verify только change-scoped files; не reset и не включать постороннюю модернизацию без явного запроса.

## Migration Plan

1. Создать backup legacy media directory и PostgreSQL database, не изменяя их.
2. Подготовить приватный RustFS bucket, persistent SQLite volume, ограниченные cache/tmp volumes, Pocket ID client и custom libvips runtime.
3. Развернуть переписанное приложение параллельно legacy-сервису с отдельными data paths и без public cutover.
4. Выполнить однократный управляемый администратором import нужных legacy originals через новый upload/processing pipeline; курировать и публиковать альбомы только после готовности derivatives.
5. Проверить public routes, OIDC, upload, processing, cache eviction и отсутствие legacy file/bot surfaces до направления трафика на новый сайт.
6. Для rollback вернуть трафик на нетронутый legacy deployment. Не удалять legacy media, database data или новые RustFS objects при rollback.
