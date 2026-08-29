## 1. Закрыть development и artifact boundaries

- [x] 1.1 Сохранить байт-в-байт локальные копии tracked SQLite/WAL/SHM и cache indexes в ignored location, удалить их version-controlled представления без удаления пользовательских данных и проверить совпадение размеров/hash, а также пустой результат `git ls-files | rg 'photo-library\.db|data/cache/\.index\.json'`.
- [x] 1.2 Дополнить `.gitignore` и `.dockerignore` правилами для `.env`, `*.db`, `*.db-wal`, `*.db-shm`, cache indexes и test results; собрать API image с безопасными sentinel-файлами и проверить, что sentinel paths отсутствуют в final image без вывода содержимого secrets.
- [x] 1.3 Добавить fail-closed `DEV_AUTH_BYPASS` в shared config и session lookup, обновить `example.env` и проверить unit-тестами три случая: default development отказ, явный development bypass и production отказ независимо от флага.
- [x] 1.4 Привязать опубликованные порты API, RustFS S3 и RustFS console в `compose-dev.yaml` к `127.0.0.1`, явно включить bypass только в dev compose и проверить через `docker compose -f compose-dev.yaml config`, `lsof` и unauthenticated `/auth/session` в конфигурациях с bypass и без него.

## 2. Сделать media cache безопасным и конкурентным

- [x] 2.1 Удалить неподдержанный Range path из application-facing `ObjectStore.response` и media route, добавить route regression test «Range на cache miss → полный объект → следующий full request полный» и проверить корректные bytes/content type без сохранения partial response.
- [x] 2.2 Оставить serialization только для initialization/index mutations, выполнять независимые `cacheGet` без записи `.index.json` на каждый hit и проверить тестами параллельные чтения, восстановление отсутствующего файла, concurrent writes и eviction до target size.
- [x] 2.3 Сформировать для каждого `<source>` и fallback `<img>` отсортированный `srcset` из всех widths, передать фактический rendered width как `sizes` и проверить unit-тестом markup/helper и Playwright-сценарием, что небольшой gallery frame не запрашивает 2560 px при доступном 640 px candidate.

## 3. Укрепить runner и readiness

- [x] 3.1 Обернуть одну итерацию job runner в `try/catch/finally`, планировать следующий tick с non-zero delay после infrastructure error и проверить детерминированным unit-тестом, что временный отказ до claim не останавливает следующий job и не создаёт busy loop.
- [x] 3.2 Сохранить `/health` как liveness и добавить `/ready` на основе startup `codecCapabilities`; проверить route-тестами `200` при полном наборе и `503` с безопасным списком missing capabilities при неполном наборе без повторного codec probe.

## 4. Интеграционная проверка

- [x] 4.1 Выполнить на Node 24.13.0 `rtk fnm exec --using=v24.13.0 pnpm lint`, `pnpm typecheck`, API/web unit tests и production builds; проверить успешный exit всех команд и отсутствие новых ошибок `git diff --check`.
- [x] 4.2 Выполнить Playwright viewer/gallery E2E, собрать API Docker runtime и запустить `check:codecs`/`CUSTOM_MEDIA_RUNTIME=1` tests внутри image; проверить responsive request, все обязательные codec capabilities и отсутствие локальных `.env`/database/cache artifacts в image.
- [x] 4.3 Повторить read-only security smoke стандартного dev stack: host ports слушают только loopback, запрос без cookie и без bypass не проходит admin boundary, явный bypass работает только в development; сохранить команды и результаты без значений credentials.
