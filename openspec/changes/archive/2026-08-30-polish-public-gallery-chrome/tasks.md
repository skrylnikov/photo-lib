## 1. Публичный контракт количества кадров

- [x] 1.1 Добавить в home query фильтрованный `photoCount` для назначенных `ready` media с derivative, сохранив `photos` только избранной подборкой; проверить focused тестом, что count учитывает тот же публичный набор и DTO не содержит новых приватных полей.
- [x] 1.2 Обновить использование inferred home DTO в `share-web` и проверить `rtk fnm exec --using=v24.13.0 pnpm --filter share-api typecheck` и `rtk fnm exec --using=v24.13.0 pnpm --filter share-web typecheck`.

## 2. Идентичность сайта и metadata маршрутов

- [x] 2.1 Добавить квадратный локальный SVG-favicon, `lang="ru"` и fallback-title `dskr.photos` в Vite root; проверить production build и наличие рабочего favicon URL в собранном `index.html`.
- [x] 2.2 Установить видимый заголовок `dskr.photos` и маршрутные `document.title` для `/`, `/album/<slug>`, неизвестного альбома и `/admin`; проверить значения title для всех четырёх состояний в браузере.

## 3. Согласованная навигация альбома

- [x] 3.1 Перевести formatter количества кадров на русские формы через `Intl.PluralRules('ru')`, добавить варианты избранной подборки и `Все N кадров →`; проверить focused unit cases для 1, 2, 5, 11 и 21.
- [x] 3.2 Передать отдельную count-подпись и настоящую ссылку `Все N кадров →` через существующий `FilmGallery` action-slot, а на странице альбома заменить внешнюю `Back to gallery` на ссылку `← Все альбомы` в том же slot; проверить корректные `href`, обычный SPA-click и native Cmd/Ctrl-click.
- [x] 3.3 Оформить общий action как спокойную контурную кнопку в палитре paper backdrop с hover/focus-visible и областью не менее 44×44 CSS px; проверить на desktop и viewport 390 px, что длинное название переносится без перекрытия и horizontal overflow.

## 4. Итоговая проверка

- [x] 4.1 Выполнить `rtk fnm exec --using=v24.13.0 pnpm --filter share-api test`, `typecheck` и `lint`; исправить только ошибки в затронутом scope.
- [x] 4.2 Выполнить `rtk fnm exec --using=v24.13.0 pnpm --filter share-web test`, `typecheck`, `lint` и `build`; проверить, что существующие gallery/viewer тесты проходят без изменений поведения.
- [x] 4.3 В браузере проверить production-like главную и полный альбом на desktop/mobile: favicon при 16×16, route titles, русские счётчики, семантические ссылки, focus-visible, back/forward, отсутствие overflow и неизменную плёночную/viewer-геометрию.
