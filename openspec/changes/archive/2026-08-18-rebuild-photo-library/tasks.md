## 1. Зафиксировать новый runtime и границы проекта

- [x] 1.1 Инвентаризировать legacy API, маршруты, переменные окружения, volumes и пакеты, которые будут удалены или заменены; отделить их от уже существующих незакоммиченных изменений модернизации.
- [x] 1.2 Перестроить workspace boundaries для одного web-приложения и API, удалив или свернув legacy-пакеты только после переноса их нужных обязанностей.
- [x] 1.3 Заменить PostgreSQL runtime на SQLite с Prisma SQLite adapter, persistent database path, WAL, foreign keys и ограниченным busy timeout.
- [x] 1.4 Создать новую SQLite-схему и миграции для `Album`, `MediaAsset`, `AlbumMedia`, `Derivative`, `UploadIntent`, `MediaJob` и `AdminSession`, с индексами для публичных и административных запросов.
- [x] 1.5 Удалить runtime-зависимости и конфигурацию PostgreSQL, Redis, BullMQ, Telegram, Effector, Emotion и Linaria; обновить Compose, Docker и example configuration для SQLite/RustFS/Pocket ID.

## 2. Реализовать Pocket ID и административную границу

- [x] 2.1 Добавить конфигурацию Pocket ID discovery, client credentials, redirect URI, разрешённых subjects/groups, session lifetime и cookie policy без логирования секретов.
- [x] 2.2 Реализовать Authorization Code flow с PKCE, state, nonce и проверкой issuer, audience, подписи и срока действия callback.
- [x] 2.3 Реализовать хэшированные opaque server-side сессии в SQLite, logout, истечение и admin middleware для tRPC и upload endpoint.
- [x] 2.4 Добавить `/admin` route guard и безопасные auth-failure outcomes; убедиться, что публичная навигация не содержит ссылки на админку.
- [x] 2.5 Покрыть проверками успешный вход, отклонённую identity, недействительный callback, истечение и logout сессии.

## 3. Добавить RustFS object storage и ограниченный кэш

- [x] 3.1 Добавить закреплённый `s3mini` и server-only `ObjectStore` для path-style RustFS: immutable keys, presigned PUT, existence check, streaming read и удаление непривязанных объектов.
- [x] 3.2 Настроить private bucket policy и минимальные credentials; добавить integration smoke-test против RustFS для PUT, HEAD, range GET, presigned upload и multipart upload.
- [x] 3.3 Реализовать authenticated upload intent и completion verification так, чтобы загрузка не становилась media record до проверки объекта.
- [x] 3.4 Реализовать отдельные bounded tmp и content-addressed derivative cache с atomic writes, LRU-индексом, high-water/target limits и безопасным восстановлением cache miss из RustFS.
- [x] 3.5 Добавить контролируемую выдачу derivative через приложение и удалить static exposure оригиналов, raw object keys и public bucket assumptions.

## 4. Реализовать media processing и современные форматы

- [x] 4.1 Собрать custom libvips runtime с libjxl, libheif и необходимыми HEIC/HEVC codecs; добавить startup и CI checks фактических Sharp input/output возможностей.
- [x] 4.2 Реализовать content-based validation JPEG, PNG, WebP, AVIF, JXL, HEIF и HEIC: decoder, limits размера/пикселей и безопасные причины ошибки без доверия расширению файла.
- [x] 4.3 Реализовать SQLite `MediaJob` с lease, retry limit, recovery истёкших running jobs и последовательный in-process runner без Node worker thread.
- [x] 4.4 Реализовать сохранение неизменного оригинала, ограниченную temporary download/cleanup и создание versioned derivatives нужных размеров в JXL, AVIF, HEIC/HEVC, WebP и JPEG.
- [x] 4.5 Настроить одну обрабатываемую задачу и bounded Sharp/libvips cache/concurrency; добавить наблюдаемые состояния pending, processing, ready и failed.
- [x] 4.6 Покрыть processing проверки корректными и повреждёнными JXL/HEIF/HEIC файлами, рестартом в середине задачи, retry и недоступным обязательным encoder.
- [ ] 4.7 Прогнать настоящий iPhone HEIC fixture через decoder и полный processing pipeline; подтвердить сохранность HEIC metadata и создание HEIC derivative.

## 5. Создать публичный и административный API

- [x] 5.1 Спроектировать shared contract surface и tRPC public queries для главной с featured photos и опубликованной страницы альбома, не раскрывающие private storage/admin metadata.
- [x] 5.2 Добавить protected tRPC admin mutations для альбомов, media membership, curator-defined order, featured state, publish и unpublish с валидацией ready derivatives.
- [x] 5.3 Добавить controlled media routes, проверяющие текущую publication state перед выдачей derivative, и одинаковый not-found outcome для неизвестных и неопубликованных альбомов.
- [x] 5.4 Удалить flat `image.list`, direct original-file serving и public reindex behavior; убедиться, что legacy routes не выполняют действия и не раскрывают данные.
- [x] 5.5 Добавить API-level проверки publication boundary, failed/pending media, upload authorization и отсутствия утечек raw storage keys.

## 6. Переписать веб-интерфейс

- [x] 6.1 Подключить Mantine, Vanilla Extract и Nano Stores; удалить legacy styling/state bindings и создать общую theme/token основу.
- [x] 6.2 Реализовать публичную главную с группами featured photos по альбомам и семантической навигацией на страницы опубликованных альбомов.
- [x] 6.3 Реализовать responsive album viewer с `picture`/`source` цепочкой JXL → AVIF → WebP → JPEG и корректным fallback.
- [x] 6.4 Реализовать `/admin`: OIDC entry/logout, список альбомов, создание/редактирование, upload state, назначение медиа, сортировка, featured state и publish controls.
- [x] 6.5 Проверить loading, empty, failure и unauthorized states, keyboard-accessible controls и отсутствие публичной ссылки на `/admin`.

## 7. Выполнить перенос и подготовить деплой

- [x] 7.1 Подготовить отдельные RustFS bucket, SQLite, cache/tmp volumes и Pocket ID client без изменения legacy deployment или данных.
- [x] 7.2 Реализовать однократный administrator-controlled import legacy originals через новый upload/processing pipeline без in-place миграции PostgreSQL-схемы.
- [x] 7.3 Сверить Docker image, runtime environment и RustFS CORS/endpoint configuration с presigned browser upload; не включать secrets в репозиторий или логи.
- [x] 7.4 Описать backup/restore границы: RustFS — долговечное медиа, SQLite — metadata/jobs/sessions, local cache/tmp — расходные данные.
- [x] 7.5 Спланировать reversible cutover и rollback на нетронутый legacy service, не удаляя legacy или новые media objects.

## 8. Провести сквозную верификацию

- [ ] 8.1 Запустить lint, typecheck/build, Prisma generation/migrations и container build на чистой среде.
- [x] 8.2 Проверить RustFS upload, cache miss/eviction, рестарт job runner, готовность JXL/AVIF/HEIC/WebP/JPEG derivatives и сохранность оригиналов.
- [ ] 8.3 Вручную пройти anonymous public gallery, published/unpublished album boundaries, Pocket ID admin flow и полный upload-to-publish сценарий.
- [x] 8.4 Проверить финальный diff на отсутствие секретов, legacy public file access, непреднамеренной правки чужого worktree и нарушения single-replica ограничения.
