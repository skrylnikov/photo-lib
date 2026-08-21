## Context

См. [proposal.md](proposal.md) для мотивации и [specs/heif-original-processing/spec.md](specs/heif-original-processing/spec.md) для поведенческого контракта.

Фактический ignored fixture `test-fixtures/heic/iphone-original.HEIC` — HEVC Main, 3024×4032, grid 6×8, 48 tile references и container rotation 270°. `heif-info` с libde265 декодирует его при снятом лимите, а Sharp 0.35.3/libvips 8.18.3 останавливается при чтении header: libvips задаёт `heif_security_limits.max_items = 16`, после чего libheif отклоняет 48 ссылок. Локальная bundled Sharp-сборка одновременно содержит только AVIF alias и не имеет HEVC decoder/encoder, поэтому её успешный AVIF-тест не характеризует production HEIC support.

Custom API image уже собирает libheif, libde265, x265 и libvips, а также содержит patch для HEIC encoding. Обработка выполняется последовательно и ограничивает размер файла, число пикселей и временное хранилище. Персональный iPhone fixture содержит EXIF/GPS и не может стать committed test asset.

## Goals / Non-Goals

**Goals:**

- Разрешить типичные современные tiled HEVC photos, включая наблюдаемый grid 6×8, сохранив конечные parser/decoder limits.
- Доказывать HEVC decode и encode реальными operations в том runtime, который будет развёрнут.
- Проверять не только header metadata, но и фактический pixel decode primary image и полный derivative path.
- Сделать regression test воспроизводимым и не содержащим пользовательские метаданные.

**Non-Goals:**

- Отключение всех libheif/libvips security limits.
- Поддержка HEIF sequences/video, auxiliary depth maps, Live Photo video или выдача оригинала браузеру как display format.
- Гарантия декодирования любого codec, который может находиться внутри общего HEIF container; обязательными остаются HEVC и AV1.
- Изменение upload API, модели данных или уже заявленного derivative set.

## Decisions

### Поднять только item/reference budget в custom libvips

Добавить version-pinned patch к libvips 8.18.3, который меняет HEIF `max_items` с 16 на 256 при сохранении остальных лимитов libvips/libheif. Значение 256 покрывает наблюдаемые 48 references и более 100 связанных items с запасом, но остаётся конечным; действующие `max_number_of_tiles`, `max_image_size_pixels`, `max_total_memory`, `max_memory_block_size`, application `maxBytes` и `maxPixels` продолжают применяться.

Перед расширением parser budget реализация должна закрепить актуальную исправленную версию libheif и документировать её вместе с patch. Container check должен вывести фактические libvips/libheif и HEVC codec versions.

Альтернатива `unlimited: true` или `LIBHEIF_SECURITY_LIMITS=off` отклонена: она снимает не только проблемный item/reference limit и официально предназначена лишь для доверенных файлов. Отдельный `heif-convert --disable-limits` subprocess отклонён по той же причине и добавляет второй media runtime. Собственный Node binding к libheif позволил бы настраивать структуру limits без patch, но несоразмерно усложнил бы текущий Sharp pipeline.

### Разделить декларативные и доказанные codec capabilities

`sharp.format.heif` остаётся диагностикой наличия container loader, но readiness строится на отдельных probes:

- декодировать неперсональный HEVC tiled fixture и получить ожидаемые pixels/orientation;
- создать небольшой HEIC с `compression: 'hevc'`, затем снова декодировать его;
- отдельно выполнить AVIF encode/decode;
- сохранить существующие JXL/WebP/JPEG checks.

Build/CI custom image обязаны выполнить все probes без skip. Локальные unit tests могут явно skip HEVC-only cases, когда bundled Sharp не содержит HEVC, но skip не считается подтверждением deployment readiness. Диагностика различает `input:hevc`, `output:hevc`, `input:avif` и `output:avif`; общая запись `heif: true` больше не используется как доказательство всех четырёх возможностей.

### Проверять пиксели до успешного результата валидации

`validateOriginal` сначала читает metadata под текущими byte/pixel limits, затем форсирует bounded decode primary image через Sharp pipeline. Для validation probe достаточно малого результата resize/raw, но pipeline должен реально запросить pixels, чтобы отсутствующий HEVC decoder, повреждённый tile или ошибка reference graph проявились до статуса `ready`. Processing использует те же input options, чтобы validation и derivative generation не расходились по limits.

Ошибки известного security-limit class маппятся в `heif_complexity_limit_exceeded`; отсутствующий обязательный codec выявляется readiness check и не маскируется как успешная поддержка. Остальные parser/decoder подробности не выдаются наружу и остаются `image_decode_failed` или общей безопасной processing error.

### Зафиксировать обезличенный tiled HEVC regression asset

Из однотонного или тестового PNG без metadata генерируется небольшой HEVC grid с количеством references больше 16 (целевой layout 6×8), после чего проверяется отсутствие EXIF, XMP, GPS и других personal metadata. Генератор и исходник фиксируются так, чтобы fixture можно было воспроизвести; готовый бинарный fixture коммитится только если его размер разумен и license/source явно указаны.

Ignored пользовательский `iphone-original.HEIC` остаётся только локальным manual oracle и не добавляется в Git. Regression test подтверждает container brand/codec, reference count, полный decode, итоговую orientation/dimensions и генерацию обязательных derivatives.

## Risks / Trade-offs

- [Повышенный item budget расширяет поверхность parser work для загруженного администратором файла] → оставить budget конечным, не менять остальные limits, сохранить byte/pixel caps и последовательную обработку, запускать исправленную libheif.
- [libvips или libheif обновятся и patch перестанет применяться либо станет ненужным] → Docker build должен падать при несовпадении patch; после обновления повторно проверить upstream defaults и удалить patch только при эквивалентном bounded поведении.
- [Простой сгенерированный HEIC проверит HEVC codec, но не tiled reference graph] → держать отдельный >16-reference fixture и не заменять им encode smoke.
- [Локальная bundled Sharp отличается от custom deployment runtime] → разрешить маркированный local skip, но сделать custom-image codec/regression checks обязательными и нескипаемыми.
- [Повторный validation decode добавляет CPU work] → использовать минимальный output probe, сохранять single-job execution и считать предсказуемую стоимость приемлемой ради раннего обнаружения повреждений.

## Migration Plan

1. Подготовить и проверить неперсональный tiled HEVC fixture; сохранить пользовательский fixture вне Git.
2. Обновить/закрепить libheif runtime и применить bounded libvips limit patch; собрать custom API image.
3. Запустить обязательные независимые HEVC/AVIF codec probes и regression tests внутри build image.
4. Обновить validation/processing input options и safe error mapping, затем прогнать tiled original через полный derivative path.
5. Развернуть image без изменения данных; ранее failed HEIF jobs автоматически не переоткрывать, пока администратор явно не запросит retry/re-upload.
6. Для rollback вернуть предыдущий image: схема данных и оригиналы не меняются, а созданные immutable derivatives совместимы с прежней версией.
