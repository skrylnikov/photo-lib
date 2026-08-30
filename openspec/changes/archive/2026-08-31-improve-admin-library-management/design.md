## Context

См. `proposal.md` и delta specs. Сейчас `Album` не имеет явной позиции: admin list сортируется по `updatedAt`, публичная главная — по `publishedAt`. Состав уже хранится в `AlbumMedia.position` и переставляется native HTML5 drag-and-drop, но метаданные и состав сохраняются разными mutation при одном общем `dirty`. `listMedia` уже возвращает все состояния и связи, однако UI показывает после перезагрузки только готовые доступные медиа. Job runner и maintenance loop работают в одном API-процессе, а object storage не участвует в SQLite-транзакциях.

## Goals / Non-Goals

**Goals:**

- Сохранить один понятный порядок альбомов и атомарный draft альбома.
- Не терять локальное редактирование при фоновых обновлениях и навигации.
- Сделать существующие media/job/storage данные управляемыми из одной админки.
- Удалять пользовательские данные надёжно при временных отказах RustFS.
- Переиспользовать текущий стек и native platform features.

**Non-Goals:**

- Пагинация, виртуализация, bulk actions, теги, подписи и редактирование EXIF.
- Замена native drag-and-drop сторонней библиотекой.
- Отмена уже выполняющейся обработки; pending/processing медиа нельзя удалить до terminal state.
- Изменение публичного film/viewer-дизайна.

## Decisions

### 1. Один глобальный `Album.position`

Добавить `Album.position` с unique index. Migration присвоит существующим альбомам плотные позиции: сначала опубликованные в текущем порядке `publishedAt DESC`, затем черновики в `updatedAt DESC`, с детерминированным `id` tie-breaker. Новый альбом получает `max(position) + 1`.

Admin API принимает полный упорядоченный список album ids, проверяет отсутствие дубликатов и точное совпадение с существующим набором, затем в SQLite-транзакции временно сдвигает старые позиции за рабочий диапазон и записывает `0..n-1`. Это сохраняет database constraint без кратковременных конфликтов. Admin list и public home читают `position ASC`; фильтрация черновиков не меняет относительный порядок опубликованных записей.

Порядок сохраняется сразу после drop или fallback-перемещения. Отдельная третья кнопка сохранения не появляется. При отказе UI возвращает последний серверный порядок и показывает ошибку.

Альтернатива — оставить сортировку по времени только в UI — не управляет публичным результатом и теряет порядок после reload. Неуникальная позиция проще мигрируется, но переносит защиту инварианта из SQLite в каждый caller.

### 2. Одна транзакционная mutation для выбранного альбома

Заменить раздельные `updateAlbum` и `setAlbumMedia` используемой клиентом mutation `saveAlbum`, принимающей id, метаданные и ordered media items. Сервер до записи проверяет album state, уникальность media ids и browser-safe readiness, а затем одной Prisma transaction обновляет `Album`, пересоздаёт `AlbumMedia` с нормализованными позициями и сохраняет featured-признаки. При любой ошибке не изменяется ни одна половина draft.

Клиент оставляет одну кнопку «Сохранить альбом» и сбрасывает `dirty` только после успешного ответа и reload подтверждённой версии. Публикация при `dirty` последовательно вызывает `saveAlbum`, затем существующую publish mutation; отказ первого шага не запускает второй. Если save прошёл, а publish отклонён из-за readiness, изменения остаются сохранённым черновиком.

Альтернатива — вызвать две старые mutation из одной кнопки — оставляет частично сохранённое состояние при отказе второго запроса.

### 3. Минимальная модель UI-состояния без нового state manager

Сохранить локальные React state и ввести один `pendingOperation` вместо отдельных несвязанных loading flags. Пока он задан, конфликтующие mutation controls disabled и показывают соответствующий loading label. Это также сериализует album reorder, save, publish, retry и delete на уровне страницы.

`dirty` продолжает защищать локальные метаданные и membership от polling. `selectAlbum`, logout и другие внутренние уходы используют одну функцию подтверждения; `beforeunload` покрывает reload/close. Отмена оставляет текущий album и draft без изменений. Успешный save обновляет server snapshot до сброса `dirty`.

### 4. Медиатека строится поверх существующего `listMedia`

Вынести независимую от выбранного альбома секцию «Медиатека». На первом этапе поиск и status filter выполняются локально: API уже возвращает исходное имя, состояние, размеры, безопасную ошибку, derivatives и album links. Это не требует pagination API, пока реальный объём библиотеки не покажет проблему.

Карточка показывает связи и доступные действия по состоянию. Большое превью открывается в Mantine Modal и использует самый широкий доступный JPEG derivative через существующий защищённый `/media` route; отдельный viewer и новые endpoints не нужны. Modal закрывается стандартными Escape/close controls и сохраняет aspect ratio.

### 5. Retry переиспользует существующий `MediaJob`

Новая admin mutation принимает media id только в terminal `failed`. После проверки `objectStore.exists(originalKey)` одна Prisma transaction переводит `MediaAsset` в `pending`, очищает `safeError` и сбрасывает существующий unique `process-media` job в `pending`: `attempts = 0`, timestamps/lease/error очищены, `availableAt = now`. Новая job не создаётся, поэтому параллельные дубликаты невозможны и текущий runner подхватывает запись обычным путём.

### 6. Удаление использует минимальный durable tombstone

Добавить `MediaDeletion` с `mediaId`, `originalKey`, `availableAt`, `attempts` и timestamps. Delete mutation загружает album links, отклоняет pending/processing и любую связь с опубликованным альбомом, затем одной SQLite transaction создаёт tombstone, удаляет связанный completed `UploadIntent` и `MediaAsset`; cascade убирает draft memberships, derivatives и jobs. После commit media routes уже не находят запись.

Maintenance loop обрабатывает tombstone идемпотентно: удаляет original, перечисляет и удаляет `derivatives/<mediaId>/` (включая частичные объекты без DB rows), очищает cache entries через новый `cacheRemove`, затем удаляет tombstone. Delete mutation запускает этот cleanup best effort сразу, а существующий периодический maintenance повторяет его с bounded backoff после ошибки. Так недоступность RustFS не удерживает медиа в библиотеке и не теряет сведения о нужной очистке.

Альтернатива — удалить DB row и выполнить `Promise.allSettled` без tombstone — короче, но навсегда забывает object keys при одном временном отказе. Удалять storage до DB опаснее: отказ SQLite оставляет живую запись без оригинала.

### 7. Проверки остаются сфокусированными

Pure helpers покрывают нормализацию album/media order, delete guard и retry transition через `node:test`. API-level проверка использует временную SQLite DB и fake object store для атомарности, tombstone retry и published blocker. Playwright flow с dev auth проверяет native drag альбомов и фото, fallback-кнопки, reload persistence, одну save-кнопку, dirty confirmations, pending disable, медиатеку, preview, retry и delete confirmation.

## Risks / Trade-offs

- [Native HTML5 drag плохо работает на части touch-устройств] → сохранить явные кнопки перемещения и проверить их отдельно.
- [Autosave порядка конфликтует с быстрыми повторными drop] → разрешать следующую перестановку после завершения текущей mutation и откатывать UI при отказе.
- [Migration меняет admin order черновиков относительно опубликованных] → полностью сохранить текущий public order, затем дать администратору единый очевидный порядок для ручной корректировки.
- [Storage cleanup может длиться после успешного UI-удаления] → routes закрываются сразу через DB, а durable tombstone и maintenance обеспечивают повторную физическую очистку.
- [Полная `listMedia` со временем станет тяжёлой] → оставить локальный поиск сейчас; добавить server pagination только после измеримого роста latency/DOM.

## Migration Plan

1. Добавить additive SQLite migration для `Album.position`, unique index и `MediaDeletion`; backfill позиции детерминированно до включения нового query order.
2. Сгенерировать Prisma Client и проверить migration на копии существующей SQLite DB, включая сохранение текущего порядка опубликованных альбомов.
3. Развернуть API и web совместно: приватные admin mutation не требуют обратной совместимости со старым клиентом.
4. После запуска проверить public home order, save/publish, retry и delete с реальным RustFS; дождаться исчезновения tombstone после успешной очистки.

Rollback приложения безопасен: старый код игнорирует additive columns/table. Migration назад не выполняется; `position` и незавершённые tombstone сохраняются до повторного развёртывания нового API, чтобы не потерять cleanup obligations.
