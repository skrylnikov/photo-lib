import type { ReactNode } from 'react';
import type { PublicPhoto } from 'types';

import { FilmGallery } from '../gallery/film';
import { PhotoViewer, usePhotoViewer } from './viewer';

export const PublicGallery = ({
  title,
  photos,
  action,
  headingLevel,
}: {
  title: string;
  photos: readonly PublicPhoto[];
  action?: ReactNode;
  headingLevel?: 1 | 2;
}) => {
  const viewer = usePhotoViewer(photos.length);
  return <>
    <FilmGallery title={title} photos={photos} action={action} headingLevel={headingLevel} onOpen={viewer.open} />
    <PhotoViewer
      title={title}
      photos={photos}
      state={viewer.state}
      onClose={viewer.close}
      onCloseComplete={viewer.finishClose}
      onNext={viewer.next}
      onPrevious={viewer.previous}
    />
  </>;
};
