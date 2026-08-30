import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

import { page } from '../../app/style.css.ts';
import { trpc, type RouterOutput } from '../../shared/api/trpc';
import { PublicGallery } from '../../shared/ui/public-gallery';

type AlbumData = NonNullable<RouterOutput['public']['album']>;

export const AlbumPage = ({ slug, navigate }: { slug: string; navigate: (path: string) => void }) => {
  const [data, setData] = useState<AlbumData | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { void trpc.public.album.query({ slug }).then((value) => { setData(value); setLoaded(true); }).catch(() => setLoaded(true)); }, [slug]);
  useEffect(() => {
    document.title = !loaded ? 'dskr.photos' : data ? `${data.title} — dskr.photos` : 'Альбом не найден — dskr.photos';
  }, [data, loaded]);
  if (!loaded) return <Container className={page}><Text>Loading album…</Text></Container>;
  if (!data) return <Container className={page}><Stack><Title order={1}>Альбом не найден</Title><Anchor href="/">← Все альбомы</Anchor></Stack></Container>;
  return <Container className={page}><Stack gap="lg">{data.description && <Text>{data.description}</Text>}<PublicGallery
    headingLevel={1}
    title={data.title}
    photos={data.photos}
    action={<Anchor href="/" onClick={(event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate('/');
    }}>← Все альбомы</Anchor>}
  /></Stack></Container>;
};
