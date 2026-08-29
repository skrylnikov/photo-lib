## 1. Navigation state и разметка ленты

- [x] 1.1 Заменить немедленный `state.index` update на локальное состояние `{ direction, targetIndex }`, коммитить один `onNext`/`onPrevious` после завершения движения и проверить focused unit test для обоих направлений, циклических границ и повторного ввода во время активного перехода.
- [x] 1.2 Провести button, keyboard и swipe navigation через один guard, сбрасывать zoom перед стартом и проверить browser-тестом, что конкурирующая анимация не запускается, а управление снова доступно после handoff.
- [x] 1.3 Перестроить settled composition в общий одно-/двухсекционный edge-to-edge `filmSurface`, поместив image window и metadata внутрь каждой viewport-секции, и проверить DOM snapshot во время движения: присутствуют ровно current и target sections с соответствующими photo id и metadata.

## 2. Движение и геометрический handoff

- [x] 2.1 Удалить `72px rotateY` navigation keyframes и реализовать одну управляемую rAF transform-анимацию общей ленты на `100vw` в нужную сторону; проверить E2E snapshots, что координаты track и обеих секций меняются монотонно в правильном направлении.
- [x] 2.2 Зафиксировать общую высоту film-band на время перехода и сохранить `object-fit: contain` для portrait/landscape пар; проверить desktop и mobile E2E, что viewport всё время покрыт плёнкой без gap и фотографии не искажают aspect ratio.
- [x] 2.3 Переносить финальную perforation phase из `200vw` track в settled `100vw` surface и добавить минимальный geometry helper только при необходимости; проверить unit test расчёта phase и E2E-допуск `0.5 CSS px` для film, target image, metadata и физических координат отверстий.
- [x] 2.4 Сериализовать navigation с close/Escape/history, сохранить reduced-motion instant transition и существующий preview/full/error lifecycle; проверить E2E-сценарии close во время движения, `prefers-reduced-motion: reduce` и delayed derivative decode без blank frame.

## 3. Замедленная покадровая QA

- [x] 3.1 Расширить `viewer-transition.spec.ts` сценариями next и previous с `__PHOTO_VIEWER_E2E_DURATION__ = 6000`, шагом `500ms`, desktop/mobile viewport и portrait/landscape fixtures; проверить на каждом snapshot направление, покрытие viewport, привязку image/metadata к секции и отсутствие perforation drift.
- [x] 3.2 Выполнить целевой slow-motion прогон в обоих направлениях, сохранить временные screenshots всех фаз в Playwright output, собрать contact sheet и покадрово подтвердить отсутствие пустого фона, шва, независимого движения фотографии, неправильной metadata и финального скачка; QA-файлы не добавлять в Git.

## 4. Итоговая проверка

- [x] 4.1 Выполнить `rtk fnm exec --using=v24.13.0 pnpm --filter share-web test`, `typecheck`, `lint` и `build`; все команды должны завершиться успешно.
- [x] 4.2 Выполнить `rtk fnm exec --using=v24.13.0 pnpm --filter share-web test:e2e` и `rtk openspec validate refine-fullscreen-film-navigation --strict`; slow navigation и существующий origin-linked transition должны пройти.
- [x] 4.3 Выполнить `rtk git diff --check` и инспекцию итогового diff; подтвердить, что API, DTO, database, storage, gallery layout и unrelated dirty-worktree изменения не вошли в scope change.
