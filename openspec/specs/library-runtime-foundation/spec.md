# library-runtime-foundation Specification

## Purpose

Предоставить однорепличный runtime, сохраняющий состояние библиотеки и аутентификации без зависимости от legacy-сервисов PostgreSQL, Redis, BullMQ и Telegram.

## Requirements

### Requirement: Runtime-состояние сохраняется в локальном SQLite
Система SHALL сохранять метаданные галереи, административные сессии, состояние загрузок и задачи обработки в локальной SQLite базе. Обычный рестарт приложения MUST сохранять завершённое состояние библиотеки и действительные неистёкшие сессии.

#### Scenario: Приложение перезапускается после публикации альбома
- **WHEN** приложение перезапускается
- **THEN** опубликованный альбом, его курируемый порядок и состояние готовых медиа остаются доступными

### Requirement: Деплой не зависит от PostgreSQL, Redis, BullMQ и Telegram
Переписанная библиотека SHALL работать с настроенными SQLite, RustFS и Pocket ID. Она MUST NOT требовать PostgreSQL-сервер, Redis-сервер, BullMQ worker или Telegram bot token для запуска и выдачи галереи.

#### Scenario: Оператор запускает переписанный сервис
- **WHEN** оператор настроил SQLite, RustFS и Pocket ID, но не настроил legacy-сервисы
- **THEN** публичная галерея и аутентификация админки запускаются штатно

### Requirement: Legacy unauthenticated file и image endpoints выведены из эксплуатации
Система MUST NOT предоставлять legacy flat image-list procedure, прямой маршрут к оригинальным файлам или публичную переиндексацию. Клиенты MUST использовать новые публичные альбомы и контролируемые derivative interfaces.

#### Scenario: Клиент запрашивает legacy direct file route
- **WHEN** клиент запрашивает удалённый маршрут оригинала или публичной переиндексации
- **THEN** система возвращает результат «не найдено» и не выполняет операции хранилища или индексации

### Requirement: Runtime artifacts не содержат локальные секреты и рабочие данные

Production container image и передаваемый Docker build context MUST исключать локальные `.env`-файлы, SQLite database/WAL/SHM, cache indexes и иные runtime-данные. Репозиторий MUST NOT отслеживать рабочую базу библиотеки или производные cache metadata.

#### Scenario: Image собирается рядом с локальным runtime
- **WHEN** оператор собирает production image в checkout, где присутствуют локальный `.env`, рабочая SQLite-база и cache index
- **THEN** эти файлы отсутствуют в build context и final image, а сборка использует только явно переданные deployment configuration и синтетические fixtures

#### Scenario: Проверяется состав репозитория
- **WHEN** выполняется проверка tracked files
- **THEN** она не находит рабочие SQLite database/WAL/SHM или cache indexes, способные раскрыть пользовательские metadata

### Requirement: Development services не публикуют привилегированные порты во внешнюю сеть по умолчанию

Локальная development configuration SHALL привязывать API и RustFS endpoints к loopback-интерфейсу. Публикация этих endpoints на внешнем интерфейсе MUST требовать отдельного явного изменения конфигурации оператором.

#### Scenario: Запускается стандартный dev stack
- **WHEN** оператор запускает version-controlled development compose configuration без дополнительных overrides
- **THEN** API, RustFS S3 API и RustFS console доступны с localhost и не слушают внешние host-интерфейсы

### Requirement: Web runtime поддерживает прямое открытие клиентских маршрутов

Система SHALL возвращать application shell при прямом browser GET или обновлении поддерживаемого клиентского SPA-маршрута и MUST сохранять исходный URL для клиентской маршрутизации. Выделенные backend и operational routes MUST сохранять настроенное proxy или health-поведение и MUST NOT подменяться SPA fallback-ответом.

#### Scenario: Администратор напрямую открывает админку

- **WHEN** браузер запрашивает `/admin` без ранее загруженного приложения
- **THEN** web runtime возвращает application shell, после чего клиентское приложение выполняет штатную проверку административной сессии

#### Scenario: Посетитель напрямую открывает публичный альбом

- **WHEN** браузер запрашивает `/album/:slug` без ранее загруженного приложения
- **THEN** web runtime возвращает application shell с сохранённым URL, и клиентское приложение запрашивает указанный альбом

#### Scenario: Клиент обращается к выделенному backend route

- **WHEN** клиент запрашивает настроенный API, media, auth или operational route
- **THEN** web runtime сохраняет существующую обработку этого route и не возвращает вместо неё SPA application shell
