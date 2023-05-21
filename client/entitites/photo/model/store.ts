import { pipe, groupBy } from 'remeda';
import { format } from 'date-fns';
import { IPhoto } from 'shared/api/photo';

import { photoDomain } from "./domain";
import { loadPhotoFx } from "./effects";

export const $photoList = photoDomain
  .createStore<IPhoto[]>([])
  .on(loadPhotoFx.doneData, (_, payload) => payload)
;


export const $groupedPhotoByMonth = $photoList.map((photoList) =>
  pipe(
    photoList,
    groupBy((x) => format(new Date(x.date), 'yyyy-MM')),
    (x) => Object.entries(x),
    (x) => x.map(([date, list]) => ({
      date,
      list,
    })),
  ));
