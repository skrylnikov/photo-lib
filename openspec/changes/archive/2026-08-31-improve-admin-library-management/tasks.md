## 1. Модель данных и миграция

- [x] 1.1 Добавить в Prisma `Album.position` с unique index и модель `MediaDeletion`, создать новую SQLite migration с детерминированным backfill текущего public order и проверить `pnpm --filter database generate` и `pnpm --filter database typecheck`.
- [x] 1.2 Применить migration к копии существующей SQLite DB и проверить запросами, что все альбомы получили уникальные плотные позиции, опубликованные сохранили порядок `publishedAt DESC`, а пользовательские album/media rows не потеряны.

## 2. Порядок и атомарное сохранение альбомов

- [x] 2.1 Добавить pure helper нормализации полного album id list и тесты на порядок, дубликаты, пропущенные и неизвестные ids через `node:test`.
- [x] 2.2 Изменить создание и чтение альбомов: новый альбом получает последнюю позицию, admin list и public home сортируются по `position ASC`; проверить API-тестом пропуск черновиков без изменения относительного public order.
- [x] 2.3 Реализовать admin mutation автосохранения полного порядка альбомов с двухфазным обновлением позиций в одной transaction и проверить тестом успешную перестановку и полный rollback при невалидном списке.
- [x] 2.4 Заменить используемые клиентом раздельные album mutation единой `saveAlbum`, атомарно сохраняющей метаданные и нормализованный состав, и проверить тестами успешную запись, duplicate/not-ready validation и отсутствие частичного изменения при отказе.

## 3. Retry и окончательное удаление медиа

- [x] 3.1 Добавить `cacheRemove` под существующим cache lock и проверить тестом удаление файла и index entry, включая идемпотентный повтор для отсутствующего ключа.
- [x] 3.2 Реализовать обработку `MediaDeletion` в maintenance loop: удалить original, все объекты под `derivatives/<mediaId>/`, cache entries и tombstone либо перенести retry с bounded backoff; проверить fake object store тестами успех, отсутствующие объекты и временный отказ.
- [x] 3.3 Реализовать delete mutation с блокировкой published links и pending/processing, созданием tombstone и каскадным удалением draft links, upload intent, derivatives и jobs; проверить API-тестами confirmation-independent contract, названия блокирующих альбомов и сохранение порядка оставшихся медиа.
- [x] 3.4 Реализовать retry mutation для terminal failed media с проверкой оригинала и атомарным сбросом существующего `process-media` job; проверить тестами переход в pending, очистку safe error, отсутствие второй job и отказ для unavailable original или non-failed status.
- [x] 3.5 Уточнить `listMedia` contract для медиатеки и проверить тестом, что после нового запроса возвращаются все состояния, размеры, безопасные ошибки, derivatives и draft/published album links без storage keys.

## 4. Управление состоянием админки

- [x] 4.1 Добавить единый `pendingOperation`, заблокировать конфликтующие действия и показать loading labels; проверить component/browser flow, что двойной клик отправляет только одну mutation.
- [x] 4.2 Объединить редактирование метаданных и состава под одной кнопкой «Сохранить альбом», удалить вторую save-кнопку и проверить, что dirty сбрасывается только после подтверждённого полного reload, а ошибка сохраняет весь локальный draft.
- [x] 4.3 Изменить publish flow: при dirty сначала выполнить `saveAlbum`, затем publish, не публиковать после ошибки save и проверить оба порядка mocked/browser запросов.
- [x] 4.4 Добавить общий guard для смены альбома и logout плюс `beforeunload`, сохранив защиту draft от polling; проверить сценарии confirm/cancel и фоновое обновление media status без потери полей, membership, порядка и featured.

## 5. Drag-and-drop альбомов и фотографий

- [x] 5.1 Добавить native drag-and-drop и кнопки перемещения для списка альбомов с autosave и rollback на серверной ошибке; проверить Playwright-сценарием persistence после reload и disabled state во время mutation.
- [x] 5.2 Сохранить существующие native drag-and-drop и ↑/↓ для фотографий, направить их в единый album draft и проверить Playwright-сценарием одинаковый сохранённый порядок после drag, fallback-перемещения и reload.

## 6. Медиатека

- [x] 6.1 Добавить независимую от выбранного альбома секцию медиатеки со всеми состояниями, размерами, safe error и album links; проверить reload после processing/failed результата без локальной upload queue.
- [x] 6.2 Добавить локальный регистронезависимый поиск по original name и status filter и проверить unit/browser-сценариями совместное применение обоих условий и пустой результат.
- [x] 6.3 Добавить большое JPEG-превью в доступной Mantine Modal через существующий `/media` route и проверить aspect ratio, Escape/close, focus return и безопасный fallback при ошибке изображения.
- [x] 6.4 Добавить на карточки применимые retry/delete actions, destructive confirmation с именем и album links и понятные blocked errors; проверить success/cancel, published blocker, active-processing blocker и обновление карточки после retry/delete.

## 7. Сквозная проверка

- [x] 7.1 Запустить `pnpm --filter database lint`, `pnpm --filter database typecheck`, `pnpm --filter share-api lint`, `pnpm --filter share-api typecheck`, `pnpm --filter share-api test`, `pnpm --filter share-web lint`, `pnpm --filter share-web typecheck`, `pnpm --filter share-web test` и `pnpm --filter share-web build`; исправить только ошибки этого change и сохранить итог команд.
- [x] 7.2 Выполнить `pnpm --filter share-web test:e2e` на локальном API с dev auth и проверить единый flow: reorder альбомов → редактирование и reorder фото → save/publish → поиск/preview → failed retry → delete и reload persistence.
- [x] 7.3 Выполнить container smoke с реальным SQLite/RustFS: проверить сохранение public order, блокировку удаления опубликованного фото, удаление draft media, физическое исчезновение original/derivatives/cache и очистку `MediaDeletion` после восстановления временно недоступного storage.
- [x] 7.4 В реальном браузере проверить native drag мышью и fallback с клавиатуры/touch-layout, dirty dialogs при смене альбома/logout/reload и отсутствие второй save-кнопки; записать непроверенные platform-сценарии явно, не отмечая их выполненными.
  - Проверено в Chromium: mouse drag, keyboard fallback, viewport 390×844, album/logout/reload guards и одна save-кнопка. Не проверены Safari/Firefox и физический touch drag (для touch предусмотрен button fallback; touch drag не входит в goal).
