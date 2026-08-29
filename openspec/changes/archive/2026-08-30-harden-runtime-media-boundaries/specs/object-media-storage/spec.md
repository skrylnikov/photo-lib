## ADDED Requirements

### Requirement: Cache сохраняет только полный derivative

Система MUST NOT сохранять частичный object-store response под cache key полного derivative. Пока end-to-end Range contract не реализован, media route SHALL получать, кешировать и возвращать полный объект независимо от входного `Range` header.

#### Scenario: Первый запрос содержит Range header
- **WHEN** опубликованный derivative отсутствует в локальном cache, а клиент запрашивает его с `Range` header
- **THEN** система возвращает полный корректный derivative и сохраняет в cache полный объект, а не выбранный диапазон байтов

#### Scenario: Полный запрос следует за Range-запросом
- **WHEN** после запроса с `Range` другой клиент запрашивает тот же derivative без `Range`
- **THEN** второй клиент получает полный декодируемый derivative из cache

### Requirement: Независимые cache hits не блокируют друг друга обновлением общего индекса

Чтение уже кешированного derivative SHALL завершаться без обязательной записи общего cache index и MUST NOT ожидать завершения независимого cache hit. Ограничение размера и eviction SHALL сохраняться при startup и добавлении новых объектов.

#### Scenario: Два клиента читают разные кешированные derivatives
- **WHEN** два клиента одновременно запрашивают разные существующие cache entries
- **THEN** медленное чтение одного файла не блокирует чтение другого из-за обновления общего index metadata

#### Scenario: Добавление превышает high-water mark
- **WHEN** новый полный derivative увеличивает cache выше настроенного high-water mark
- **THEN** система удаляет старые entries до target size и сохраняет согласованное состояние индекса
