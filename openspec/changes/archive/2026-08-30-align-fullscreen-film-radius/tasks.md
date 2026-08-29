## 1. Выравнивание fullscreen-композиции

- [x] 1.1 Масштабировать radius fullscreen-изображения пропорционально отношению размеров выбранной фотографии в ленте и viewer; `filmRadius` плёночной подложки в gallery, fullscreen и animated clone оставить нулевым.

## 2. Регрессия перехода

- [x] 2.1 Дополнить `apps/share-web/e2e/viewer-transition.spec.ts` измерением computed `border-radius` и размеров фото, галерейной и fullscreen-ленты и animated clone; проверить пропорциональный radius фотографии и нулевой radius плёночной подложки.
- [x] 2.2 Выполнить `rtk fnm exec --using=v24.13.0 pnpm --filter share-web test:e2e -- viewer-transition.spec.ts`, `rtk fnm exec --using=v24.13.0 pnpm --filter share-web lint`, `rtk fnm exec --using=v24.13.0 pnpm --filter share-web typecheck` и `rtk fnm exec --using=v24.13.0 pnpm --filter share-web build`; визуально просмотреть сохранённые промежуточные кадры desktop и mobile.
