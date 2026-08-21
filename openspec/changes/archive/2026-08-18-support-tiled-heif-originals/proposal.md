## Why

Текущая проверка HEIF фактически доказывает только работу AVIF внутри HEIF-контейнера. Настоящий HEVC-based HEIC с iPhone 17 Pro Max имеет tiled grid 6×8 и отклоняется libheif до декодирования: 48 ссылок в `iref` превышают установленный libvips лимит 16, хотя тот же файл успешно декодируется системным HEIF runtime при снятом ограничении.

## What Changes

- Поддержать валидные HEVC-based HEIF/HEIC/HIF originals с tiled/grid-компоновкой в пределах настроенных byte/pixel limits.
- Сохранить защитные лимиты libheif и повысить только узкий item/reference budget до документированного bounded значения; не использовать глобальный `LIBHEIF_SECURITY_LIMITS=off` или безусловный Sharp `unlimited`.
- Разделить capability checks для AVIF/AV1 и HEIF/HEIC/HEVC, чтобы успешная AVIF-проверка больше не считалась доказательством HEVC decode/encode.
- Добавить обезличенный реальный или синтетический tiled HEVC fixture и обязательную проверку полного decode/resize/derivative path без персональных EXIF/GPS данных.
- Возвращать стабильную безопасную ошибку, когда файл превышает разрешённую сложность либо deployment runtime не содержит HEVC decoder.

## Capabilities

### New Capabilities

- `heif-original-processing`: безопасная валидация и обработка HEVC-based HEIF/HEIC/HIF originals, включая bounded tiled/grid images и отдельную проверку HEVC runtime.

### Modified Capabilities

Нет.

## Impact

- `apps/share-api/src/media`: input options, runtime capability probes, validation, processing и codec checks.
- `apps/share-api/Dockerfile` и patch set custom libvips/libheif: точечная настройка HEIF security limits и подтверждение HEVC decoder/encoder.
- `apps/share-api/src/media/*.test.ts` и `test-fixtures/heic`: неперсональный tiled HEVC regression fixture и сквозные проверки.
- Существующие upload/public APIs и схема данных не меняются; уже заявленный набор JXL/AVIF/HEIC/WebP/JPEG derivatives сохраняется.
- Изменение уточняет незавершённый media-processing slice из `rebuild-photo-library`; при последующей синхронизации артефактов требования не должны дублироваться или противоречить ему.
