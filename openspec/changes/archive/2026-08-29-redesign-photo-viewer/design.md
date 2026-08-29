## Context

Публичные film-lines уже имеют единую тёмную плёночную поверхность, собственные поля и responsive-геометрию. Viewer должен использовать ту же surface-систему, но с фиксированной по высоте перфорацией: размер отверстий не должен зависеть от высоты фотографии. Состояние viewer сохраняет originating button для focus restoration; открытие и закрытие должны перемещать единую композицию плёнки, фотографии и подписи, не меняя backdrop.

## Goals / Non-Goals

**Goals:**

- Сделать плёночную поверхность viewer и главной одной визуальной системой с переиспользуемой базовой геометрией.
- Разместить компактную моноширинную metadata rail перед нижней перфорацией.
- Масштабировать перфорацию и поля viewer пропорционально через единый film scale, сохраняя intrinsic aspect ratio фотографии.
- Реализовать симметричное origin-linked приближение и обратное отдаление без внешней animation-зависимости.
- Сохранить текущие navigation, zoom, history, focus, loading/error и privacy boundaries.

**Non-Goals:**

- Изменение публичного DTO, API, effective capture date, EXIF privacy или порядка альбомных фотографий.
- Изменение justified layout главной, состава film-lines или hover-поведения thumbnail.
- Добавление подписей к кадрам на главной странице.
- Переход на внешний lightbox, motion framework или remote font/asset.

## Decisions

### Общий film surface с фиксированной перфорацией

Вынести из публичной строки общую визуальную основу: gradient background, border/radius и базовые custom properties для полей и фиксированной по высоте перфорации. Перфорация рисуется двумя top/bottom strip-patterns с постоянными размерами отверстий; высота фотографии не масштабирует отверстия. Главная и viewer добавляют только собственную layout-геометрию поверх этой основы.

Альтернатива — растягивать SVG-mask на всю высоту surface. Она отклоняется: процентная высота отверстий делает перфорацию гигантской на полноэкранных кадрах.

### Пропорциональный масштаб плёнки

Использовать числовой `film scale` как presentation token. Базовые desktop/mobile значения главной остаются эталоном; viewer увеличивает через этот token вертикальные и горизонтальные поля, fixed strip-size и связанные расстояния до фотографии. Масштаб не должен менять размеры самого изображения или его aspect ratio.

Perforation strips используют фиксированные width/step/height tokens, а цвет отверстий совпадает с backdrop. Они не растягиваются по высоте фотографии и не создают горизонтальный overflow.

### Metadata rail в потоке плёнки

Разметка viewer располагает film window, metadata rail и затем нижнюю перфорацию. Rail получает `min-width: 0`, контролируемое переполнение и responsive wrapping/ellipsis, чтобы длинные значения не расширяли surface.

Визуально показываются только название альбома, frame number и локализованная дата/время. `alt` остаётся у изображения и в accessible dialog label, но не превращается в четвёртую строку, потому что имена файлов могут быть длинными и шумными.

Альтернатива — оставить текущий handwritten caption и помещать его над lower perforation. Она отклоняется: handwritten font конфликтует с маркировкой плёнки, а подпись визуально перекрывает отверстия.

Общий film scale продолжает управлять размером отверстий и inset, но не свободным пространством после rail. Нижний padding viewer вычисляется как `scaled perforation height + scaled inset + metadata gap`; gap равен `4px` на desktop и `3px` на mobile. Так подпись остаётся компактно привязана к нижней перфорации и не наползает на отверстия при большом масштабе кадра.

### FLIP-подобная origin-linked transition без новой библиотеки

Сохранить originating button и исходную film-line в viewer state и запомнить её `DOMRect` при открытии. После layout viewer измерить rect строки, rect выбранного кадра внутри неё и rect целевого кадра viewer, затем создать визуальную копию исходной строки со всеми кадрами. Копия переводится одним локальным Web Animations API или эквивалентным CSS transition так, чтобы выбранный кадр стал anchor целевого кадра; вся строка движется и масштабируется вместе с ним. Для сохранения aspect ratio используется единый scale по X/Y, а размеры полей и perforation clone нормализуются относительно target viewer до начала transform. Backdrop плавно меняет background-color в течение той же transition: прозрачен в начале, непрозрачен к моменту settle; отдельной opacity/transform-анимации backdrop нет. При закрытии выполнить тот же переход в обратном направлении до unmount.

Анимировать composition wrapper, а не image отдельно: это сохраняет единую скорость для фотографии, плёнки и подписи и не заставляет backdrop исчезать во время transition. Если source или target rect недоступен, использовать центрированный scale fallback.

Анимация не должна зависеть от фиксированного таймера, меньшего длительности transition: закрытие удерживает viewer до завершения animation или cancellation, после чего выполняет существующий history/focus lifecycle.

Handoff выполняется в две фазы. После достижения конечного progress animated clone остаётся поверх viewer, финальная composition становится видимой, а layout phase измеряет обе поверхности и компенсирует дробное расхождение их верхней и нижней границ. Clone удаляется только на следующем animation frame после подтверждённого layout. При закрытии clone стартует из той же скорректированной fullscreen-геометрии, поэтому обратный переход остаётся симметричным.

Геометрия clone интерполируется между двумя реальными состояниями, а не получает fullscreen-поля до начала transform. При progress `0` padding, border, perforation inset/height/step и высота поверхности берутся из измеренной исходной film-line; при progress `1` они равны нормализованным значениям fullscreen composition. Финальная layout-коррекция измеряет не только внешнюю поверхность, но и cloned anchor относительно фактического viewer image. Вертикальный inset clone и его translate корректируются совместно: граница плёнки совмещается без перемещения уже совмещённой фотографии. Та же скорректированная геометрия используется как начало reverse transition.

Rect исходной film-line и выбранного anchor фиксируются синхронно до mount viewer и включения scroll lock. Root layout резервирует стабильный scrollbar gutter, чтобы блокировка прокрутки не меняла доступную ширину страницы. После создания clone исходная film-line получает только `visibility: hidden`: она остаётся в layout flow, но не рисуется под clone. Исходная visibility восстанавливается при handoff, close finish, fallback, cancellation и effect cleanup. Fullscreen surface и её clone используют `box-shadow: none`, поскольку отдельная верхняя или нижняя тень создаёт ложную дополнительную полосу плёнки.

Альтернатива — оставить `clip-path: circle(...)` с координатами viewport. Она отклоняется: координаты source сейчас интерпретируются внутри film element, закрытие не является обратным, а динамические размеры кадра дают неточный центр.

### Стабильный preview-to-full handoff

Готовность полноразмерного изображения хранится как URL успешно декодированного derivative, а не как общий boolean viewer. `load` запускает `HTMLImageElement.decode()`; полноразмерный слой становится видимым только если завершившийся URL всё ещё является URL текущего кадра. Preview остаётся под ним до конца короткого opacity transition. Кэшированный `complete` image проходит ту же decode-проверку, а позднее завершение старого URL не может открыть full-слой нового кадра.

### Reduced motion и существующие interaction boundaries

При `prefers-reduced-motion: reduce` transform/FLIP и decorative slide transitions отключаются, сохраняя accessible controls и metadata. Escape, focus trap/restoration, history back, swipe, zoom и error fallback остаются активными. Body scroll lock сохраняется только пока viewer смонтирован.

## Risks / Trade-offs

- [Исходная кнопка может исчезнуть или изменить положение во время viewer] → проверять source rect перед стартом и перед закрытием; при отсутствии использовать центрированный fallback.
- [Производительность Web Animations и CSS transition может различаться на iPhone Safari] → ограничить animation одной transform на composition wrapper, иметь CSS fallback без WAAPI и проверить реальный Safari viewport.
- [Длинные metadata могут визуально перегрузить узкий экран] → ограничить rail шириной film surface, разрешить controlled wrapping/ellipsis и не показывать имя файла отдельным label.
- [Разная высота фотографий изменит расстояние до нижней перфорации] → держать rail в обычном потоке после фиксированного lower perforation strip, а поля и strip-size задавать общим token, не абсолютными позициями.
- [Отложенная загрузка derivative может задержать hero transition] → использовать width/height из public DTO для layout, а при ошибке изображения анимировать error surface тем же безопасным fallback.

## Migration Plan

1. Выделить общие film surface tokens/primitives и подключить их к viewer без изменения главного layout.
2. Перестроить viewer markup в порядок `film surface → image window → metadata rail → lower perforation area`, затем удалить растягиваемый viewer-specific mask/perforation.
3. Реализовать source/target measurement и симметричный open/close lifecycle с reduced-motion fallback.
4. Добавить focused tests для metadata order, viewer state/origin fallback и неограниченного aspect ratio; выполнить web lint, typecheck, build и ручную visual QA на desktop, mobile, Safari, keyboard, swipe и reduced-motion.
5. Для rollback вернуть только viewer presentation и transition styles/state к предыдущей версии; API, storage и database не требуют rollback.
