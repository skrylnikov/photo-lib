import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

const testDirectory = await mkdtemp(join(tmpdir(), 'photo-library-admin-test-'));
const databasePath = join(testDirectory, 'library.db');
const migrationsPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../packages/database/prisma/migrations-sqlite');
const migrationNames = (await readdir(migrationsPath, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const database = new Database(databasePath);
for (const migrationName of migrationNames) {
  database.exec(await readFile(join(migrationsPath, migrationName, 'migration.sql'), 'utf8'));
}
database.close();

process.env.DATABASE_URL = `file:${databasePath}`;
const [{ appRouter }, { createAdminRouter }, { prisma }] = await Promise.all([
  import('./index'),
  import('./admin'),
  import('database'),
]);
const caller = appRouter.createCaller({
  req: {} as never,
  res: {} as never,
  session: { id: 'test', subject: 'admin', groups: [], expiresAt: new Date('2099-01-01') },
});
const browserSafeFormats = ['jxl', 'avif', 'heic', 'webp', 'jpeg'] as const;

after(async () => {
  await prisma.$disconnect();
  await rm(testDirectory, { recursive: true, force: true });
});

const createAlbumWithFeaturedPhoto = async (album: {
  id: string;
  position: number;
  published: boolean;
  slug: string;
}) => {
  await prisma.album.create({
    data: {
      ...album,
      title: album.slug,
      publishedAt: album.published ? new Date(`2026-08-${String(20 - album.position).padStart(2, '0')}T00:00:00Z`) : null,
      media: {
        create: {
          position: 0,
          featured: true,
          media: {
            create: {
              id: `media-${album.id}`,
              originalKey: `originals/${album.id}`,
              originalName: `${album.slug}.jpg`,
              originalMime: 'image/jpeg',
              originalBytes: 1,
              width: 10,
              height: 10,
              status: 'ready',
              createdBy: 'admin',
              derivatives: {
                create: browserSafeFormats.map((format) => ({
                  format,
                  width: 10,
                  height: 10,
                  version: 'test',
                  objectKey: `derivatives/${album.id}/${format}/10`,
                  bytes: 1,
                })),
              },
            },
          },
        },
      },
    },
  });
};

test('album APIs use the persisted global order while public home skips drafts', async () => {
  await createAlbumWithFeaturedPhoto({ id: 'draft', position: 0, published: false, slug: 'draft' });
  await createAlbumWithFeaturedPhoto({ id: 'published-b', position: 1, published: true, slug: 'published-b' });
  await createAlbumWithFeaturedPhoto({ id: 'published-a', position: 2, published: true, slug: 'published-a' });

  const created = await caller.admin.createAlbum({ slug: 'new-draft', title: 'New draft', description: null });
  assert.equal(created.position, 3);
  assert.deepEqual((await caller.admin.listAlbums()).map((album) => album.id), [
    'draft',
    'published-b',
    'published-a',
    created.id,
  ]);
  assert.deepEqual((await caller.public.home()).albums.map((album) => album.slug), [
    'published-b',
    'published-a',
  ]);
});

test('album reorder persists dense positions and rejects invalid full lists without changes', async () => {
  const before = (await caller.admin.listAlbums()).map((album) => album.id);
  const reordered = [before[2], before[0], before[3], before[1]];
  await caller.admin.reorderAlbums({ albumIds: reordered });
  assert.deepEqual((await caller.admin.listAlbums()).map((album) => [album.id, album.position]),
    reordered.map((id, position) => [id, position]));

  await assert.rejects(
    () => caller.admin.reorderAlbums({ albumIds: [...reordered.slice(0, -1), 'unknown'] }),
    /unknown_album_ids/,
  );
  assert.deepEqual((await caller.admin.listAlbums()).map((album) => album.id), reordered);
});

test('saveAlbum atomically saves metadata and normalized membership', async () => {
  await caller.admin.saveAlbum({
    id: 'draft',
    slug: 'draft-edited',
    title: 'Draft edited',
    description: 'Saved together',
    items: [
      { mediaId: 'media-published-b', featured: false },
      { mediaId: 'media-draft', featured: true },
    ],
  });
  const saved = await prisma.album.findUniqueOrThrow({
    where: { id: 'draft' },
    include: { media: { orderBy: { position: 'asc' } } },
  });
  assert.equal(saved.title, 'Draft edited');
  assert.deepEqual(saved.media.map(({ mediaId, position, featured }) => ({ mediaId, position, featured })), [
    { mediaId: 'media-published-b', position: 0, featured: false },
    { mediaId: 'media-draft', position: 1, featured: true },
  ]);

  await assert.rejects(() => caller.admin.saveAlbum({
    id: 'draft',
    slug: 'duplicate-rejected',
    title: 'Duplicate rejected',
    description: null,
    items: [
      { mediaId: 'media-draft', featured: false },
      { mediaId: 'media-draft', featured: true },
    ],
  }), /duplicate_media/);

  await prisma.mediaAsset.create({
    data: {
      id: 'media-processing',
      originalKey: 'originals/processing',
      originalName: 'processing.jpg',
      originalMime: 'image/jpeg',
      originalBytes: 1,
      width: 0,
      height: 0,
      status: 'processing',
      createdBy: 'admin',
    },
  });
  await assert.rejects(() => caller.admin.saveAlbum({
    id: 'draft',
    slug: 'not-ready-rejected',
    title: 'Not ready rejected',
    description: null,
    items: [{ mediaId: 'media-processing', featured: false }],
  }), /media_not_ready:media-processing/);

  const unchanged = await prisma.album.findUniqueOrThrow({
    where: { id: 'draft' },
    include: { media: { orderBy: { position: 'asc' } } },
  });
  assert.equal(unchanged.title, 'Draft edited');
  assert.deepEqual(unchanged.media.map(({ mediaId }) => mediaId), ['media-published-b', 'media-draft']);
});

test('deleteMedia blocks unsafe states and atomically removes draft-only media without confirmation input', async () => {
  const cleanupCalls: Array<{ mediaId: string; originalKey: string }> = [];
  const deleteCaller = createAdminRouter({
    objectStore: {} as never,
    cleanupMediaDeletion: ({ mediaId, originalKey }) => {
      cleanupCalls.push({ mediaId, originalKey });
      return Promise.resolve();
    },
  }).createCaller({
    req: {} as never,
    res: {} as never,
    session: { id: 'test', subject: 'admin', groups: [], expiresAt: new Date('2099-01-01') },
  });

  await assert.rejects(() => deleteCaller.deleteMedia({ id: 'media-published-b' }),
    /media_in_published_albums:published-b/);
  await assert.rejects(() => deleteCaller.deleteMedia({ id: 'media-processing' }), /media_processing/);

  await prisma.albumMedia.create({ data: { albumId: 'draft', mediaId: 'media-published-a', position: 2 } });
  await prisma.mediaJob.create({
    data: { mediaId: 'media-draft', kind: 'process-media', status: 'completed', completedAt: new Date() },
  });
  await prisma.uploadIntent.create({
    data: {
      mediaId: 'media-draft',
      objectKey: 'upload-intent/media-draft',
      originalName: 'draft.jpg',
      expectedMime: 'image/jpeg',
      expectedBytes: 1,
      status: 'completed',
      expiresAt: new Date('2099-01-01'),
      createdBy: 'admin',
    },
  });

  await deleteCaller.deleteMedia({ id: 'media-draft' });
  assert.equal(await prisma.mediaAsset.findUnique({ where: { id: 'media-draft' } }), null);
  assert.equal(await prisma.mediaJob.count({ where: { mediaId: 'media-draft' } }), 0);
  assert.equal(await prisma.uploadIntent.count({ where: { mediaId: 'media-draft' } }), 0);
  assert.deepEqual(await prisma.albumMedia.findMany({
    where: { albumId: 'draft' },
    orderBy: { position: 'asc' },
    select: { mediaId: true, position: true },
  }), [
    { mediaId: 'media-published-b', position: 0 },
    { mediaId: 'media-published-a', position: 2 },
  ]);
  assert.deepEqual(cleanupCalls, [{ mediaId: 'media-draft', originalKey: 'originals/draft' }]);
  assert.ok(await prisma.mediaDeletion.findUnique({ where: { mediaId: 'media-draft' } }));
});

test('retryMedia resets the one failed job only when its original is available', async () => {
  const availableOriginals = new Set(['originals/failed']);
  const retryCaller = createAdminRouter({
    objectStore: { exists: (key: string) => Promise.resolve(availableOriginals.has(key)) } as never,
    cleanupMediaDeletion: () => Promise.resolve(),
  }).createCaller({
    req: {} as never,
    res: {} as never,
    session: { id: 'test', subject: 'admin', groups: [], expiresAt: new Date('2099-01-01') },
  });
  const createFailedMedia = (id: string) => prisma.mediaAsset.create({
    data: {
      id,
      originalKey: `originals/${id.replace('media-', '')}`,
      originalName: `${id}.jpg`,
      originalMime: 'image/jpeg',
      originalBytes: 1,
      width: 0,
      height: 0,
      status: 'failed',
      safeError: 'codec_failed',
      createdBy: 'admin',
      jobs: {
        create: {
          kind: 'process-media',
          status: 'failed',
          attempts: 3,
          startedAt: new Date('2026-08-30T00:00:00Z'),
          completedAt: new Date('2026-08-30T00:01:00Z'),
          safeError: 'codec_failed',
        },
      },
    },
  });

  await createFailedMedia('media-failed');
  await retryCaller.retryMedia({ id: 'media-failed' });
  const retried = await prisma.mediaAsset.findUniqueOrThrow({
    where: { id: 'media-failed' },
    include: { jobs: true },
  });
  assert.equal(retried.status, 'pending');
  assert.equal(retried.safeError, null);
  assert.equal(retried.jobs.length, 1);
  assert.equal(retried.jobs[0]?.status, 'pending');
  assert.equal(retried.jobs[0]?.attempts, 0);
  assert.equal(retried.jobs[0]?.safeError, null);
  assert.equal(retried.jobs[0]?.completedAt, null);

  await createFailedMedia('media-missing');
  await assert.rejects(() => retryCaller.retryMedia({ id: 'media-missing' }), /media_original_unavailable/);
  assert.equal((await prisma.mediaAsset.findUniqueOrThrow({ where: { id: 'media-missing' } })).status, 'failed');
  await assert.rejects(() => retryCaller.retryMedia({ id: 'media-processing' }), /media_not_failed/);
});

test('listMedia returns durable library states and album links without storage keys', async () => {
  const media = await caller.admin.listMedia();
  assert.deepEqual(new Set(media.map((item) => item.status)), new Set(['ready', 'pending', 'processing', 'failed']));

  const failed = media.find((item) => item.id === 'media-missing');
  assert.ok(failed);
  assert.equal(failed.safeError, 'codec_failed');
  assert.equal(failed.originalBytes, 1);
  assert.deepEqual([failed.width, failed.height], [0, 0]);

  const published = media.find((item) => item.id === 'media-published-b');
  assert.ok(published);
  assert.deepEqual(published.derivatives.map(({ format }) => format).sort(), [...browserSafeFormats].sort());
  assert.ok(published.albumLinks.some(({ album }) => album.title === 'published-b' && album.published));
  assert.ok(published.albumLinks.some(({ album }) => album.title === 'Draft edited' && !album.published));

  assert.equal(JSON.stringify(media).includes('originalKey'), false);
  assert.equal(JSON.stringify(media).includes('objectKey'), false);
});
