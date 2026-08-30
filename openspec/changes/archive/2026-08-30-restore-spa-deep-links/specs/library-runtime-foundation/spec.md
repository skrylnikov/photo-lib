## ADDED Requirements

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
