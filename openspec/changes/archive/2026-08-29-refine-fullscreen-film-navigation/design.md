## Context

См. `proposal.md` — Why. Сейчас `PhotoViewer` меняет `state.index` до начала navigation animation, из-за `key={photo.id}` заменяет settled composition и применяет к новому `viewerFilm` короткий `translateX(72px) rotateY(...)`. Origin-linked open/close transition при этом уже имеет отдельный измеряемый lifecycle, URL-scoped decode readiness и допуск handoff `0.5 CSS px`; их нельзя смешивать с новой логикой перелистывания.

Существующий Playwright-сценарий умеет через `__PHOTO_VIEWER_E2E_DURATION__` замедлять origin-linked transition до `6000ms` и численно снимать промежуточную геометрию, но не активирует next/previous navigation.

## Goals / Non-Goals

**Goals:**

- Двигать одну edge-to-edge плёночную ленту на один viewport в выбранном направлении.
- Держать уходящий и входящий кадры одновременно смонтированными и привязанными к собственным секциям плёнки до завершения перехода.
- Сохранить стабильную высоту fullscreen film-band во время горизонтального движения, независимо от сочетания portrait/landscape фотографий.
- Сделать момент нормализации двухсекционной ленты в settled composition геометрически незаметным.
- Получить детерминированную замедленную покадровую проверку обоих направлений без новой runtime-зависимости.

**Non-Goals:**

- Использование Browser Fullscreen API или скрытие browser chrome.
- Изменение origin-linked открытия/закрытия, gallery layout, DTO, порядка кадров или циклической логики индексов.
- Drag-follow анимация, инерция, очередь из нескольких navigation-команд или новый motion framework.
- Постоянное хранение QA-скриншотов в репозитории.

## Decisions

### Один film-surface с одной или двумя viewport-секциями

Settled viewer сохраняет один `filmSurface` шириной в viewport. На время next/previous он превращается в общую двухсекционную ленту: для next порядок равен `[current, target]`, для previous — `[target, current]`. Каждая секция занимает ровно один viewport и содержит image window вместе с соответствующей metadata rail. Общий родитель рисует фон и верхнюю/нижнюю перфорацию на полную ширину ленты.

Next переводит ленту из `translateX(0)` в `translateX(-100vw)`. Previous переводит её из `translateX(-100vw)` в `translateX(0)`. Stage обрезает только содержимое за viewport; в видимой области на всём пути остаётся плёнка.

Так фотография и metadata автоматически получают тот же transform, что и плёнка. Альтернатива с двумя независимо анимируемыми fullscreen surfaces отклонена: она создаёт шов и требует синхронизировать два background-pattern. Анимация только image window отклонена, потому что не соответствует движению плёнки.

### Навигация коммитит индекс после движения

Локальное transition-state хранит `direction` и `targetIndex`, не меняя основной `state.index` при старте. После последнего кадра анимации viewer коммитит ровно один `onNext` или `onPrevious` и в том же React update очищает transition-state. До завершения активного перехода дополнительные next/previous запросы игнорируются; controls, keyboard и swipe используют один общий guard.

Zoom сбрасывается до `1` перед началом движения, как и при текущей смене photo id. Close/Escape/history не теряются: запрос закрытия во время короткого navigation transition дожидается его нормализации и затем запускает существующий close lifecycle. Это не допускает одновременной работы navigation-track и origin clone.

Альтернатива с немедленным изменением индекса отклонена: она удаляет уходящий кадр. Очередь команд отклонена как лишняя для короткого viewer transition.

### Одна transform-анимация и перенос фазы перфорации

Движется только общий track transform. Image, metadata, background и perforation pseudo-elements не получают независимых horizontal transforms. Размер film-band фиксируется общей доступной высотой stage на время transition, а изображения сохраняют intrinsic aspect ratio через существующий `object-fit: contain` и viewer max-height calculation.

Лента сохраняет исходную perforation phase во время движения. Перед удалением лишней секции вычисляется видимая финальная фаза pattern с учётом пройденного viewport-offset; она переносится в одноcекционный settled surface. Это предотвращает скачок отверстий, даже если ширина viewport не кратна `filmPerforationStep`.

Последний animated snapshot и первый settled snapshot сравниваются отдельно для surface, target image и metadata. Нормализация допустима только при расхождении каждой границы не более `0.5 CSS px`.

### Переиспользование preview/full handoff

Обе секции используют существующие derivative selectors и error surface. Уходящая секция продолжает показывать уже готовый current image; входящая как минимум показывает доступный preview во время движения. После коммита target становится обычным current frame и проходит существующую URL-scoped `decode()` проверку и crossfade. Отдельный preloader или общий image cache не добавляется.

### Управляемая rAF-анимация для покадровой проверки

Navigation использует тот же dependency-free `requestAnimationFrame` подход и easing, что origin-linked transition. Production duration остаётся коротким presentation token; в E2E существующий `__PHOTO_VIEWER_E2E_DURATION__` задаёт `6000ms`. Track публикует только тестовые `data-*` признаки direction/progress, необходимые для чтения геометрии.

Playwright проверяет next и previous с шагом `500ms` на desktop и mobile. Каждый snapshot измеряет:

- монотонное направление track, current section и target section;
- полное покрытие viewport общей плёнкой без горизонтального gap;
- постоянные offsets image и metadata относительно своей film-section;
- совпадение движения perforation pattern и track без независимого drift;
- соответствие текста metadata входящей фотографии;
- расхождение не более `0.5 CSS px` при final-to-settled handoff.

Для ручного visual QA тот же прогон сохраняет временные screenshots всех фаз в Playwright output и собирает contact sheet для покадрового просмотра; эти файлы не коммитятся. Постоянный тест оставляет числовые assertions и trace on failure.

## Risks / Trade-offs

- [Разная ориентация соседних фотографий может менять высоту контента] → использовать общую доступную высоту film-band во время transition и `object-fit: contain`, затем измерять final-to-settled handoff.
- [Perforation pattern может прыгнуть при схлопывании `200vw` в `100vw`] → переносить вычисленную финальную phase в settled surface и проверять физические координаты отверстий, а не только CSS custom property.
- [Поздний `decode()` входящего full derivative может вызвать пустой кадр] → держать preview до URL-scoped decode, не связывая готовность двух фотографий одним boolean.
- [Одновременные navigation и close animations могут конфликтовать] → сериализовать lifecycle: завершить и нормализовать navigation, затем запускать существующий close transition.
- [Покадровые screenshots замедляют обычный CI] → сохранять полный визуальный набор только в целевом QA-прогоне; постоянные assertions выполняются через виртуальное время.

## Migration Plan

1. Ввести двухсекционное navigation-state и единый guard для button, keyboard и swipe без изменения origin open/close.
2. Перестроить settled viewer в совместимую одно-/двухсекционную film-track разметку и заменить старые `72px rotateY` keyframes.
3. Добавить перенос perforation phase и измеряемый handoff, затем сохранить существующий preview/full lifecycle.
4. Расширить unit/E2E проверки, выполнить замедленный desktop/mobile прогон и визуально разобрать contact sheet в обоих направлениях.
5. Для rollback вернуть прежние navigation classes/state; API, storage и database rollback не требуются.
