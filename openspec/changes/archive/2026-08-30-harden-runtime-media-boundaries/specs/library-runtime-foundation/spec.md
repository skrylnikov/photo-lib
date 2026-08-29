## ADDED Requirements

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
