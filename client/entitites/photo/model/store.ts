import { IPhoto } from 'shared/api/photo';

import { photoDomain } from "./domain";
import { loadPhotoFx } from "./effects";

export const $photoList = photoDomain
  .createStore<IPhoto[]>([])
  .on(loadPhotoFx.doneData, (_, payload) => payload)
;
