import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

import { page } from '../../app/style.css.ts';
import { trpc, type RouterOutput } from '../../shared/api/trpc';
import { PublicGallery } from '../../shared/ui/public-gallery';
import { wrapper } from './style.css.ts';

type HomeData = RouterOutput['public']['home'];

export const Home = ({ navigate }: { navigate: (path: string) => void }) => {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void trpc.public.home.query().then(setData).catch(() => setError(true)); }, []);

  return <Container className={`${page} ${wrapper}`}>
    <Stack gap="xl">
      <Title order={1}>Photo library</Title>
      {error && <Text c="red">Gallery is temporarily unavailable.</Text>}
      {!error && !data && <Text>Loading gallery…</Text>}
      {data?.albums.map((album) => <PublicGallery
        key={album.slug}
        title={album.title}
        photos={album.photos}
        action={<Anchor component="button" onClick={() => navigate(`/album/${album.slug}`)}>Open album</Anchor>}
      />)}
      {data?.albums.length === 0 && <Text c="dimmed">No published featured albums yet.</Text>}
    </Stack>
  </Container>;
};
