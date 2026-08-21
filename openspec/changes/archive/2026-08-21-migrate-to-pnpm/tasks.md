# Задачи: миграция с npm на pnpm

## 1. Конфигурация воркспейса

- [x] 1.1 Создать `pnpm-workspace.yaml` со списком пакетов `apps/share-api`, `apps/share-web`, `packages/config`, `packages/database`, `packages/tsconfig`, `packages/types`, с `overrides: {"@babel/core": "7.29.7"}` и начальным `onlyBuiltDependencies` (sharp, esbuild, движковые пакеты Prisma, хелперы node-gyp); проверить, что файл парсится, через пробный `pnpm install --lockfile-only`
- [x] 1.2 Обновить корневой `package.json`: удалить поля `workspaces` и корневой `overrides`, выставить `packageManager` в запиненную `pnpm@12.0.0-rc.8` (без Corepack — standalone pnpm сам переключает версии по этому полю); убедиться, что `pnpm --version` в репозитории возвращает ровно 12.0.0-rc.8
- [x] 1.3 В потребляющих манифестах (`apps/share-api/package.json`, `apps/share-web/package.json` и остальных пакетах с внутренними зависимостями) заменить спецификаторы `"config"`, `"database"`, `"tsconfig"` с `"*"` на `"workspace:*"`; проверить через `grep -rn '": "\*"' apps/*/package.json packages/*/package.json`, что ни одна внутренняя зависимость не осталась с голым `"*"`

## 2. Миграция локфайла

- [x] 2.1 Выполнить `pnpm import` для генерации `pnpm-lock.yaml` из `package-lock.json`; убедиться, что сгенерированный локфайл сохраняет текущие resolved-версии (выборочно сверить записи `@babel/core`, sharp, turbo, typescript со старым локфайлом) и что `pnpm install --frozen-lockfile` проходит без предупреждений «ignored build scripts» сверх уже внесённых в `onlyBuiltDependencies`
- [x] 2.2 Удалить `package-lock.json` и выполнить чистую установку (`rm -rf node_modules && pnpm install --frozen-lockfile`) для подтверждения самодостаточности нового локфайла; проверить наличие `node_modules/.pnpm` и резолв линковок воркспейсов (`pnpm ls -r --depth -1` перечисляет все шесть пакетов)

## 3. Docker-образы

- [x] 3.1 Обновить build-стейдж `apps/share-api/Dockerfile`: добавить `npm install --global pnpm@12.0.0-rc.8`, заменить `npm ci --include=optional` на `pnpm install --frozen-lockfile`, а шаг `npm explore sharp -- npm run build` — на glob-резолв sharp внутри `node_modules/.pnpm/sharp@*/node_modules/sharp` с запуском сборки там; проверить успешность `docker build --target build -f apps/share-api/Dockerfile .` и прохождение кодек-проверок внутри него (`check:codecs`, custom-runtime тест)
- [x] 3.2 Обновить рантайм-стейдж `apps/share-api/Dockerfile`: копировать `pnpm-lock.yaml` рядом с `package.json` и `node_modules`, установить pnpm глобально и в этом стейдже, поменять `CMD` на `sh -c "pnpm --filter database db:migrate:deploy && exec node apps/share-api/dist/index.js"`; проверить локальным запуском рантайм-образа с одноразовым SQLite-путём, что миграции применяются и API стартует
- [x] 3.3 Обновить `apps/share-web/Dockerfile`: добавить глобальную установку pnpm до инсталла, заменить `npm ci` на `pnpm install --frozen-lockfile` и `npm run build --workspace share-web` на `pnpm --filter share-web build` (глобальную установку turbo сохранить); проверить, что `docker build -f apps/share-web/Dockerfile .` даёт образ с собранным сайтом

## 4. Dev-окружение

- [x] 4.1 Обновить `command` сервиса share-api в `compose-dev.yaml` на `sh -c "pnpm --filter database db:migrate:deploy && exec pnpm --filter share-api start"`; проверить, что `docker compose -f compose-dev.yaml up --build` поднимает rustfs + API, применяет миграции и отвечает на порту 4001

## 5. Документация

- [x] 5.1 Обновить раздел команд сборки/тестов в `AGENTS.md`: `pnpm install` (+ заметка про закоммиченный локфайл теперь `pnpm-lock.yaml`), `pnpm dev --filter share-web` / `--filter share-api`, `pnpm build`, `pnpm lint`, `pnpm generate`, `pnpm db:migrate:dev`, `pnpm studio`, плюс примечание про standalone-установку pnpm для контрибьюторов (Corepack не используется, версия берётся из `packageManager`); проверить, что все задокументированные команды реально выполняются как написано
- [x] 5.2 Обновить два примера `import:legacy` в `docs/operations/storage-and-cutover.md` с `npm run … --workspace share-api --` на `pnpm --filter share-api import:legacy --` (проброс аргументов); проверить каждую переписанную команду через `--help`/сухой запуск или мануальной сверкой семантики CLI pnpm

## 6. Сквозная верификация

- [x] 6.1 Прогнать весь локальный пайплайн через pnpm/turbo: `pnpm build`, `pnpm lint`, `pnpm typecheck` и тест-сьют share-api (`pnpm --filter share-api test`); убедиться, что всё проходит без ошибок фантомных зависимостей — если такие всплывут, чинить объявлением зависимости в соответствующем манифесте, а не hoisting'ом
- [x] 6.2 Подтвердить, что репозиторий чист от npm: `git grep -l "package-lock"` ничего не возвращает вне истории/упоминаний в openspec-доках, `.gitignore` не требует записей под локфайлы, а `pnpm why @babel/core` показывает применённый override на версии 7.29.7
