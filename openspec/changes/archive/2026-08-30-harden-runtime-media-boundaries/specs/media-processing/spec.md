## ADDED Requirements

### Requirement: Job runner продолжает цикл после временной инфраструктурной ошибки

Встроенный job runner SHALL перехватывать ошибку отдельной итерации получения, восстановления или выполнения job, безопасно регистрировать её и планировать следующую итерацию. Ошибка одной итерации MUST NOT останавливать обработку последующих jobs до перезапуска процесса и MUST NOT создавать busy loop.

#### Scenario: SQLite временно отклоняет получение job
- **WHEN** одна итерация runner завершается инфраструктурной ошибкой до claim job
- **THEN** runner ожидает bounded delay, запускает следующую итерацию и позже обрабатывает доступный job без перезапуска приложения

#### Scenario: Ошибка возникает после claim job
- **WHEN** выполнение claimed job завершается ошибкой
- **THEN** существующие retry и lease rules сохраняются, а runner продолжает принимать последующие jobs

### Requirement: Readiness отражает обязательные codec capabilities

Система SHALL отличать process liveness от готовности принимать media workload. Readiness endpoint MUST возвращать неуспешный HTTP status и безопасный список недоступных capabilities, если хотя бы один обязательный decoder или encoder не прошёл фактическую startup probe.

#### Scenario: Все обязательные codecs доступны
- **WHEN** startup probes подтверждают все обязательные input и output capabilities
- **THEN** liveness и readiness endpoints возвращают успешный status

#### Scenario: Обязательный encoder недоступен
- **WHEN** process запущен, но startup probe не подтверждает обязательный encoder
- **THEN** liveness остаётся успешной, readiness возвращает неуспешный status и workload не считается готовым к маршрутизации
