## Why

Одинаковые 3px на маленькой фотографии в ленте и на крупной фотографии в viewer выглядят по-разному. Скругление нужно масштабировать только вместе с фотографией; плёночная подложка в превью и fullscreen остаётся квадратной.

## What Changes

- Масштабировать радиус выбранной фотографии вместе с размером кадра между галереей и fullscreen.
- Сохранить плёночную подложку без скругления в gallery, fullscreen и animated clone, исключив скачок радиуса фотографии при handoff.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `public-album-gallery`: скругление относится только к фотографии и её рамке, но не к плёночной подложке.

## Impact

- `apps/share-web/src/shared/gallery/film.css.ts`
- `apps/share-web/src/shared/ui/viewer.css.ts`
- Визуальная проверка gallery и fullscreen viewer на desktop и mobile.
