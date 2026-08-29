## ADDED Requirements

### Requirement: Development auth bypass требует явного локального opt-in

Система MUST NOT выдавать административную сессию без cookie только на основании `NODE_ENV=development`. Development auth bypass SHALL включаться отдельной явной настройкой, SHALL действовать только в development runtime и MUST оставаться выключенным по умолчанию.

#### Scenario: Development runtime запущен без bypass
- **WHEN** приложение работает с `NODE_ENV=development`, но отдельная настройка bypass отсутствует
- **THEN** запрос без действительной session cookie остаётся неаутентифицированным и не получает доступ к admin procedures

#### Scenario: Локальный разработчик явно включает bypass
- **WHEN** development runtime запущен с документированной opt-in настройкой bypass
- **THEN** локальный запрос без session cookie получает development principal для тестирования admin workflow

#### Scenario: Bypass ошибочно задан в production
- **WHEN** production runtime получает настройку development bypass
- **THEN** bypass игнорируется или startup завершается безопасной ошибкой, а запрос без действительной session cookie остаётся неаутентифицированным
