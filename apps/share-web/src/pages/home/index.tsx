import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

import { page } from '../../app/style.css.ts';
import { trpc, type RouterOutput } from '../../shared/api/trpc';
import { formatAllFrames, formatFrameCount } from '../../shared/gallery/layout';
import { PublicGallery } from '../../shared/ui/public-gallery';
import { wrapper } from './style.css.ts';

type HomeData = RouterOutput['public']['home'];

export const Home = ({ navigate }: { navigate: (path: string) => void }) => {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    document.title = 'dskr.photos — фотоальбомы';
    void trpc.public.home.query().then(setData).catch(() => setError(true));
  }, []);

  return <Container className={`${page} ${wrapper}`}>
    <Stack gap="xl">
      <Title order={1}>dskr.photos</Title>
      {error && <Text c="red">Gallery is temporarily unavailable.</Text>}
      {!error && !data && <Text>Loading gallery…</Text>}
      {data?.albums.map((album) => <PublicGallery
        key={album.slug}
        title={album.title}
        photos={album.photos}
        countLabel={formatFrameCount(album.photos.length, true)}
        action={<Anchor href={`/album/${album.slug}`} onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate(`/album/${album.slug}`);
        }}>{formatAllFrames(album.photoCount ?? album.photos.length)}</Anchor>}
      />)}
      {data?.albums.length === 0 && <Text c="dimmed">No published featured albums yet.</Text>}
    </Stack>
  </Container>;
};
