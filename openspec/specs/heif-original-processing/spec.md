# heif-original-processing Specification

## Purpose

Определяет безопасную и проверяемую поддержку HEVC-based HEIF/HEIC/HIF originals, включая tiled/grid-фотографии современных камер, без подмены этой поддержки наличием AVIF-кодека.

## Requirements

### Requirement: HEVC-based HEIF originals проходят фактическое декодирование

Система SHALL распознавать HEIF по содержимому и SHALL обрабатывать primary image в валидных HEVC-based HEIF, HEIC и HIF originals независимо от расширения файла или заявленного MIME type. Проверка MUST декодировать пиксели primary image в пределах настроенных byte/pixel limits, а не ограничиваться чтением container metadata.

#### Scenario: Загружен tiled HEIC современного iPhone

- **WHEN** администратор загружает валидный HEVC-based HEIC с grid 6×8 и 48 ссылками, а его размер укладывается в настроенные лимиты
- **THEN** система декодирует primary image, принимает оригинал для обработки и не классифицирует его как повреждённый только из-за количества tile references

#### Scenario: Расширение не совпадает с содержимым

- **WHEN** валидный HEVC-based HEIF имеет расширение `.HIF`, `.HEIF` или неизвестное расширение
- **THEN** система определяет формат по содержимому и обрабатывает его как HEIF original

#### Scenario: Container metadata читается, но пиксели не декодируются

- **WHEN** HEIF container сообщает допустимые размеры, но primary image повреждён или требуемый HEVC bitstream не декодируется
- **THEN** система завершает обработку безопасной ошибкой декодирования и не создаёт готовый media asset

### Requirement: Сложность HEIF остаётся ограниченной

Система MUST применять документированный конечный budget к item/reference и tile complexity HEIF-файла вместе с общими byte, pixel и memory limits. Она MUST NOT отключать все decoder security limits ради совместимости с tiled originals.

#### Scenario: Валидный камерный grid укладывается в budget

- **WHEN** число HEIF items, references и tiles не превышает настроенный compatibility budget, а остальные safety limits соблюдены
- **THEN** система разрешает декодирование файла

#### Scenario: HEIF превышает complexity budget

- **WHEN** HEIF-файл превышает разрешённое число items, references или tiles
- **THEN** система отклоняет его со стабильной безопасной причиной `heif_complexity_limit_exceeded`, не публикует его и не создаёт derivatives

### Requirement: HEVC capability проверяется отдельно от AVIF

Deployment verification SHALL независимо подтверждать HEVC input decode, HEVC output encode и AVIF/AV1 support фактическими codec operations. Наличие общего HEIF container loader или успешная AVIF operation MUST NOT считаться подтверждением HEVC decode или encode.

#### Scenario: AVIF доступен, но HEVC decoder отсутствует

- **WHEN** runtime успешно декодирует AVIF, но не может декодировать контрольный HEVC-based HEIF
- **THEN** HEVC input capability считается недоступной, а обязательная deployment check завершается ошибкой

#### Scenario: HEVC decoder доступен, но encoder отсутствует

- **WHEN** runtime декодирует контрольный HEVC-based HEIF, но не может создать HEIC/HEVC derivative
- **THEN** input и output capabilities отражаются раздельно, а deployment не считается готовым к обязательному derivative set

### Requirement: Tiled HEIF проходит полный processing path

После успешной валидации система SHALL сохранить оригинал без изменения байтов и SHALL создать настроенный набор derivatives из визуально ориентированного primary image. Container transformations MUST быть применены ровно один раз.

#### Scenario: HEIF содержит rotation transform

- **WHEN** tiled HEIF primary image содержит container rotation transform
- **THEN** созданные derivatives имеют ожидаемую визуальную ориентацию и размеры, а rotation не применяется повторно

#### Scenario: Обработка tiled original завершена

- **WHEN** валидный tiled HEVC-based original проходит processing runtime с требуемыми decoder и encoders
- **THEN** media asset становится готовым только после создания полного обязательного набора JXL, AVIF, HEIC/HEVC, WebP и JPEG derivatives
