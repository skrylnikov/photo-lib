## Context

API работает одним процессом с SQLite, локальным sequential job runner и приватным RustFS. Derivatives проходят через авторизационную проверку Fastify route и локальный файловый cache; web получает три размера каждого формата. См. `proposal.md` для причин изменения и delta specs для наблюдаемых контрактов.

Текущий checkout содержит пользовательские runtime-файлы и незакоммиченные изменения, поэтому миграция tracked SQLite/cache artifacts должна сохранить локальные байты и не затронуть viewer worktree.

## Goals / Non-Goals

**Goals:**

- Закрыть неявный admin bypass и внешнюю публикацию dev endpoints без добавления новой auth-системы.
- Сделать Docker/repository boundary проверяемой и исключить локальные secrets/data из final image.
- Устранить cache poisoning частичными ответами и убрать запись общего index из cache-hit hot path.
- Сохранить простой однопроцессный runner, но не позволить одной ошибке остановить его навсегда.
- Разделить liveness и media readiness и использовать уже вычисленные startup codec probes.
- Передавать браузеру существующие derivative widths без новых форматов и processing jobs.

**Non-Goals:**

- Корректный HTTP Range/206 proxy, video streaming или CDN.
- Redis/BullMQ, отдельный worker process, несколько API replicas или новая очередь.
- Viewer animation, admin pagination, изменение derivative format matrix или deployment production stack.
- Новый cache daemon, точная распределённая LRU или потоковая запись cache miss клиенту и на диск одновременно.

## Decisions

### 1. Auth bypass получает отдельный fail-closed флаг

Добавить boolean configuration `DEV_AUTH_BYPASS`, default `false`. Development principal создаётся только при одновременных `NODE_ENV=development` и `DEV_AUTH_BYPASS=true`; production никогда не принимает bypass. `compose-dev.yaml` может явно задавать флаг для прежнего локального UX, но host ports API и RustFS привязываются к `127.0.0.1`.

Альтернатива — полностью удалить bypass и всегда требовать Pocket ID. Это безопаснее, но усложняет локальную разработку без дополнительной пользы при loopback-only compose.

### 2. Runtime data исключается на обеих границах

`.dockerignore` исключает `.env` во всех каталогах, SQLite/WAL/SHM, cache indexes, local runtime data и test results. `.gitignore` использует те же классы runtime artifacts. Уже tracked databases/indexes удаляются из version control только после сохранения локальных файлов в ignored location; пользовательские данные не удаляются.

Final API image продолжает получать необходимые workspace packages и синтетические HEIC fixtures по явным `COPY`, но не весь локальный runtime. Проверка image composition использует имена sentinel-файлов, а не вывод значений secrets.

Альтернатива — полагаться на `.gitignore`. Docker не использует его как security boundary, поэтому этого недостаточно.

### 3. Range support временно удаляется из derivative path

`ObjectStore.response` для application path возвращает только полный объект; media route не передаёт клиентский `Range`. Cache key всегда означает полный derivative. Поддержку Range следует вернуть только отдельным change с проксированием status, `Content-Range`, `Content-Length` и с bypass частичных ответов мимо full-object cache.

Альтернатива — сразу реализовать корректный 206 proxy. Текущие photo derivatives не требуют Range, поэтому это лишняя ветка и дополнительный риск.

### 4. Cache reads становятся независимыми, writes остаются сериализованными

Initialization и mutation index остаются под существующим promise lock. `cacheGet` читает entry и файл вне глобального write lock, обновляет `lastAccess` только в памяти и не ждёт `saveIndex`. Индекс сохраняется при `cachePut`, eviction и explicit stats/maintenance; eviction по-прежнему выполняется после добавления объекта.

Это сознательно делает persisted LRU после crash менее точной, но cache остаётся disposable и bounded. Отдельный journal, SQLite cache index и background flush не вводятся.

### 5. Runner всегда планирует следующую итерацию

Loop оборачивает iteration в `try/catch/finally`: ошибка безопасно логируется, а следующий tick планируется в `finally` с коротким bounded delay. Existing claim CAS, lease recovery, retry count и terminal transition не меняются. Для детерминированной проверки выделяется минимальная функция одной итерации с инъецируемыми операциями/таймером, без нового runner abstraction layer.

### 6. `/health` остаётся liveness, `/ready` становится readiness

`/health` подтверждает, что process отвечает. Новый `/ready` использует сохранённый результат startup codec probe: `200` при полном наборе, `503` с именами отсутствующих capabilities иначе. Повторные probes на каждый запрос не запускаются; DB и RustFS deep health checks в этот change не входят.

### 7. `<picture>` использует существующие widths как `srcset`

Для каждого формата derivatives сортируются по width и формируют `url widthw`. `FilmRow` передаёт рассчитанный rendered width в `sizes`; fallback `<img>` получает такой же responsive list. Порядок JXL → AVIF → HEIC → WebP → JPEG и viewer-specific выбор preview/full не меняются.

Альтернатива — добавлять новые thumbnail jobs. Уже существующего варианта 640 px достаточно для текущей gallery geometry.

## Risks / Trade-offs

- [Существующие локальные скрипты полагаются на автоматический bypass] → документировать `DEV_AUTH_BYPASS=1` и обновить только dev compose/example env.
- [Удаление tracked database может потерять локальную копию] → сначала сохранить точные файлы в ignored location и проверить размер/hash; не удалять пользовательские bytes в рамках cleanup.
- [Игнорирование Range увеличивает ответ редкому range-клиенту] → photo derivatives ограничены; полноценный Range вернуть только при подтверждённой потребности.
- [Persisted LRU становится приблизительной между writes] → cache disposable, а hard size bounds и eviction при writes сохраняются.
- [Runner retry может создать быстрый error loop] → использовать non-zero bounded delay после infrastructure error и сохранить текущую idle delay.
- [Browser самостоятельно выбирает candidate] → unit-тестировать markup/srcset, а network transfer проверить browser E2E на representative viewport.

## Migration Plan

1. Сохранить tracked рабочие SQLite/WAL/SHM и cache indexes в ignored local location без изменения содержимого; зафиксировать только удаление их version-controlled представления.
2. Добавить ignore rules и sentinel-проверку Docker context/final image до изменения runtime behavior.
3. Ввести fail-closed auth flag и loopback port bindings; проверить unauthenticated и explicit bypass flows.
4. Исправить full-object media/cache path и cache locking, затем responsive `srcset`.
5. Добавить runner recovery и `/ready`, выполнить unit, build, browser E2E и container codec checks.
6. При rollback вернуть предыдущий application image/config, но не возвращать secrets или рабочие database files в Git/image. Если ранее опубликованный image мог содержать `.env`, credentials ротируются независимо от rollback.
