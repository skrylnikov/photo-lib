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
  if (!loaded) return <Container className={page}><Text>Loading album…</Text></Container>;
  if (!data) return <Container className={page}><Stack><Title order={1}>Album not found</Title><Anchor component="button" onClick={() => navigate('/')}>Back to gallery</Anchor></Stack></Container>;
  return <Container className={page}><Stack gap="lg"><Anchor component="button" onClick={() => navigate('/')}>Back to gallery</Anchor>{data.description && <Text>{data.description}</Text>}<PublicGallery headingLevel={1} title={data.title} photos={data.photos} /></Stack></Container>;
};
