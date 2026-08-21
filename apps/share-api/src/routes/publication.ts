export const isPubliclyVisibleMedia = (status: string, hasPublishedAlbum: boolean): boolean =>
  status === 'ready' && hasPublishedAlbum;
