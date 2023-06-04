import { createDomain, sample } from 'effector';

import { trpc, RouterOutput } from '../../shared/api';

export const photoDomain = createDomain();

export const loadPhotoFx = photoDomain.createEffect(async () => {
  const result = await trpc.image.list.query();

  return result.filter((image) => image.thumbnails.length > 0);
});

export const $photoList = photoDomain
  .createStore<RouterOutput['image']['list']>([])
  .on(loadPhotoFx.doneData, (_, payload) => payload);

export const $photoMap = $photoList.map((photoList) =>
  Object.fromEntries(
    photoList.map((photo, i) => [photo.id, { ...photo, index: i }])
  )
);

export const openFull = photoDomain.createEvent<string>();
export const closeFull = photoDomain.createEvent();
export const nextFull = photoDomain.createEvent();
export const prevFull = photoDomain.createEvent();

export const $fullPhotoId = photoDomain.createStore<string | null>(null);
$fullPhotoId.on(openFull, (_, id) => id);
$fullPhotoId.reset(closeFull);
$fullPhotoId.on(nextFull, (id) => {
  const photoList = $photoList.getState();
  const index = photoList.findIndex((photo) => photo.id === id);
  const nextIndex = index + 1;
  if (nextIndex >= photoList.length) {
    return photoList[0].id;
  }
  return photoList[nextIndex].id;
});
$fullPhotoId.on(prevFull, (id) => {
  const photoList = $photoList.getState();
  const index = photoList.findIndex((photo) => photo.id === id);
  const nextIndex = index - 1;
  if (nextIndex < 0) {
    return photoList[photoList.length - 1].id;
  }
  return photoList[nextIndex].id;
});

export const $fullPhoto = sample({
  source: [$photoMap, $fullPhotoId] as const,
  fn: ([photoMap, fullPhotoId]) => {
    if (!fullPhotoId) {
      return null;
    }
    return photoMap[fullPhotoId];
  },
});
