## Why

Полноэкранный viewer сейчас использует отдельную визуальную версию плёнки: другая перфорация, рукописные подписи и несимметричная анимация открытия/закрытия. Из-за этого переход от кадра на главной к просмотру выглядит как смена интерфейса, а не как приближение камеры к тому же кадру.

## What Changes

- Заменить самостоятельную геометрию viewer-плёнки на общий presentation primitive с публичными film-lines, включая фон, базовую пластику плёнки и фиксированную perforation geometry.
- Увеличить перфорацию и отступы вокруг фотографии пропорционально масштабу viewer-плёнки на desktop и mobile, сохранив исходное соотношение сторон кадра.
- Переместить визуальную metadata-подпись перед нижней перфорацией, чтобы перфорация находилась под подписями; использовать моноширинный шрифт и тёплый контрастный цвет.
- Показывать в подписи название альбома, номер кадра и локализованные дату/время; `photo.alt` оставить доступным альтернативным текстом, но не выводить как отдельную визуальную строку.
- Добавить origin-linked animation всей исходной film-line: при открытии плёнка, все фотографии и перфорация приближаются к viewer единым пропорциональным transform, затем показывается выбранный кадр; во время полёта backdrop прозрачен, а в fullscreen становится непрозрачным. При закрытии выполняется обратное отдаление к исходной строке, а при недоступном origin используется центрированный fallback.
- Стабилизировать загрузку fullscreen derivative через URL-зависимое состояние декодирования, выполнить измеряемый двухфазный handoff между animated clone и финальной composition и отделить компактный зазор metadata до нижней перфорации от общего film scale.
- Убрать внешнюю тень сверху и снизу fullscreen-плёнки, стабилизировать layout при включении scroll lock и скрывать исходную film-line на время open/close transition без удаления её из потока.
- Синхронизировать внутреннюю геометрию clone с обеими фазами перехода: в ленте clone начинается с точных полей и границ исходной film-line, а в fullscreen отдельно совмещает границы плёнки и выбранной фотографии без пиксельного сдвига при handoff.
- Сохранить навигацию, zoom, touch/keyboard interaction, focus restoration, back-button behavior, безопасные metadata и reduced-motion контракт без изменений API или DTO.

## Capabilities

### New Capabilities

<!-- Новая capability не вводится: меняется существующая публичная gallery capability. -->

### Modified Capabilities

- `public-album-gallery`: уточнить визуальный контракт полноэкранного viewer, metadata rail, общей плёнки и обратных film-linked transitions.

## Impact

- `apps/share-web/src/shared/gallery/film.css.ts`: общие film surface tokens/primitives, используемые главной и viewer.
- `apps/share-web/src/shared/ui/viewer.css.ts`: layout viewer-плёнки, fixed perforation strips, подпись, responsive/reduced-motion и transition styles.
- `apps/share-web/src/shared/ui/viewer.tsx`: измерение исходного кадра, origin-linked open/close lifecycle, стабильный preview-to-full handoff и разметка metadata rail.
- Web visual/manual verification и focused viewer/layout tests; API, database, storage, public DTO и внешние зависимости не изменяются.
