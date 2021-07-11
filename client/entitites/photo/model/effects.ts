import { getPhotolistAll } from 'shared/api/photo';

import { photoDomain } from './domain';


export const loadPhotoFx = photoDomain.createEffect(async () => {
  return await getPhotolistAll();
});
