# Миграция с npm на pnpm

## Почему

Репозиторий — монорепо на npm workspaces, и модель установки npm медленна и склонна к hoisting: фантомные зависимости утекают между пакетами, `npm ci` при каждой Docker-сборке заново скачивает всё дерево, а общего контентно-адресуемого хранилища между воркспейсами нет. pnpm даёт более быстрые установки (локальный глобальный store + жёсткие ссылки), строгую изоляцию `node_modules`, которая ловит необъявленные импорты прямо при установке, и меньшие по размеру, более воспроизводимые слои Docker-сборки. Стандартизироваться на pnpm нужно сейчас, пока воркспейс небольшой (6 пакетов).

## Что меняется

- **Смена пакетного менеджера**: npm workspaces заменяются на pnpm workspaces.
  - Добавляется `pnpm-workspace.yaml` с теми же шестью пакетами (`apps/share-api`, `apps/share-web`, `packages/config`, `packages/database`, `packages/tsconfig`, `packages/types`); поле `workspaces` удаляется из корневого `package.json`.
  - Поле `packageManager` в корне меняется с `npm@11.19.0` на зафиксированную версию `pnpm@12.0.0-rc.8`; Corepack не используется — pnpm сам переключает версии по этому полю (manage-package-manager-versions).
  - Корневой `overrides` (`@babel/core: 7.29.7`) переезжает в конфигурацию overrides pnpm.
  - **BREAKING** для контрибьюторов: `package-lock.json` удаляется; единственным источником истины становится закоммиченный `pnpm-lock.yaml`. Локальные чекауты требуют одного свежего `pnpm install` и включённого Corepack.
- **Спецификаторы внутренних зависимостей**: ссылки на внутренние пакеты (`config`, `database`, `tsconfig`) меняются с `"*"` на `"workspace:*"`, чтобы локальные пакеты линковались однозначно — особенно потому, что воркспейс-пакет с именем `config` конфликтует с одноимённым посторонним публичным npm-пакетом.
- **Docker-образы**: оба Dockerfile переводятся на установку через `pnpm install --frozen-lockfile` вместо `npm ci`, `npm run <script> --workspace <pkg>` заменяется на `pnpm --filter <pkg> <script>`, а в рантайм-стейдж share-api копируются `pnpm-lock.yaml` (вместе со структурой виртуального стора `.pnpm`).
- **Сборка sharp из исходников**: сборка sharp против системного libvips в образе share-api сохраняется, но вызывается через путь пакета внутри стора `node_modules/.pnpm` вместо `npm explore`.
- **Dev-compose**: команда сервиса в `compose-dev.yaml` переписывается с workspace-флагов npm на фильтры pnpm.
- **Документация**: обновляются команды в `AGENTS.md` и примеры с npm в `docs/operations/storage-and-cutover.md`.

Поведение приложения, API, схема БД и все существующие возможности не меняются.

## Возможности

### Новые возможности

(нет)

### Изменяемые возможности

(нет)

Это изменение относится к чистой тулинговой/сборочной инфраструктуре: изменения требований на уровне возможностей отсутствуют, поэтому specs пропущены через `skip_specs: true`. Все семь существующих возможностей сохраняют текущее поведение.

## Влияние

- **Корень репозитория**: `package.json` (workspaces, overrides, packageManager), новый `pnpm-workspace.yaml`, замена локфайла (`package-lock.json` → `pnpm-lock.yaml`).
- **Манифесты воркспейсов**: `apps/share-api/package.json`, `apps/share-web/package.json`, `packages/*/package.json` (внутренние зависимости переходят на `workspace:*`).
- **Развёртывание**: `apps/share-api/Dockerfile` (build- и runtime-стейджи, CMD), `apps/share-web/Dockerfile`, `compose-dev.yaml` (команда share-api).
- **Документация**: `AGENTS.md`, `docs/operations/storage-and-cutover.md`.
- **Контрибьюторы**: нужна standalone-установка pnpm (любая ≥10 — нужная версия подтянется автоматически из поля `packageManager`); Corepack не используется; однократная переустановка `node_modules`.
- **Turbo**: на уровне конфига изменений нет (в `turbo.json` нет npm-специфичных настроек); совместимость с pnpm workspaces проверяется задачами верификации.
- Без изменений в коде приложения, tRPC API, схеме/миграциях Prisma и поведении хранения.
