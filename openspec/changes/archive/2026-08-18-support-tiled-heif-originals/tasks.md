## 1. Подготовить безопасные regression fixtures

- [x] 1.1 Создать воспроизводимый неперсональный HEVC grid fixture с layout 6×8 и более чем 16 `iref` references; зафиксировать исходник/команду генерации и ожидаемые dimensions/orientation.
- [x] 1.2 Проверить fixture утилитами libheif и тестом репозитория на HEVC brand/codec, число tiles/references и отсутствие EXIF, XMP, GPS и других пользовательских metadata.
- [x] 1.3 Добавить отдельный малый over-budget fixture или детерминированный генератор, доказывающий отказ при превышении выбранного конечного item/reference budget.

## 2. Исправить custom HEIF runtime

- [x] 2.1 Выбрать и закрепить актуальную исправленную версию libheif, совместимую с libvips 8.18.3, и задокументировать фактические libheif/libde265/x265 versions в codec diagnostics.
- [x] 2.2 Добавить version-pinned libvips patch, повышающий только HEIF `max_items`/reference budget с 16 до 256 и оставляющий остальные parser, tile, image-size и memory limits включёнными; Docker build MUST падать, если patch больше не применим.
- [x] 2.3 Обновить custom API image так, чтобы build-stage codec check декодировал tiled HEVC fixture и отдельно проверял HEIC/HEVC encode, AVIF encode/decode, JXL, WebP и JPEG без skip.

## 3. Разделить capabilities и усилить валидацию

- [x] 3.1 Разделить media runtime diagnostics на фактические `input:hevc`, `output:hevc`, `input:avif` и `output:avif`, не используя общий HEIF loader или AVIF success как доказательство HEVC support.
- [x] 3.2 Вынести общие bounded Sharp input options для validation и processing; сохранить `maxBytes`, `maxPixels` и конечные decoder limits без `unlimited: true` и `LIBHEIF_SECURITY_LIMITS=off`.
- [x] 3.3 Изменить `validateOriginal`, чтобы после metadata inspection он форсировал bounded pixel decode primary image и отклонял header-only, повреждённые или codec-unsupported HEIF files до готового состояния.
- [x] 3.4 Добавить безопасную классификацию известного HEIF item/reference/tile limit failure как `heif_complexity_limit_exceeded`, не раскрывая сырые сообщения native decoder для остальных ошибок.
- [x] 3.5 Применить те же input options в derivative processing и подтвердить однократное применение HEIF container transformations к визуальной ориентации результата.

## 4. Покрыть HEIF поведение тестами

- [x] 4.1 Заменить вводящий в заблуждение AVIF-as-HEIF тест отдельными AVIF и HEVC cases; local HEVC skip разрешать только по фактическому HEVC probe и никогда не считать readiness success.
- [x] 4.2 Добавить обязательный custom-runtime тест, в котором 6×8 HEVC grid проходит metadata inspection, полный pixel decode и resize, а вариант выше budget получает `heif_complexity_limit_exceeded`.
- [x] 4.3 Добавить негативные проверки повреждённого primary bitstream и runtime без HEVC decoder, подтверждающие отсутствие готового media asset и derivatives.
- [x] 4.4 Добавить integration test полного processing path: байты original не меняются, orientation/dimensions корректны, а JXL, AVIF, HEIC/HEVC, WebP и JPEG derivatives создаются до перехода media asset в `ready`.

## 5. Провести верификацию и подготовить rollout

- [x] 5.1 Запустить targeted API tests, lint, typecheck и build на Node 24.13.0, затем собрать API Docker image и выполнить в нём нескипаемые codec/regression checks.
- [x] 5.2 Локально прогнать ignored `iphone-original.HEIC` как manual oracle через validation и полный processing path; записать только технические размеры/codec outcomes без EXIF/GPS значений.
- [x] 5.3 Проверить финальный diff на отсутствие персонального HEIC, EXIF/GPS, глобального отключения security limits, секретов и изменений upload API/схемы данных.
- [ ] 5.4 Развернуть новый image без автоматического retry старых failed jobs, проверить codec diagnostics и один явный HEIF re-upload/retry; для rollback сохранить предыдущий image tag.
