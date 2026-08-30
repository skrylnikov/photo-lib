import { prisma } from 'database';

import { cacheRemove } from './cache';
import { objectStore } from './object-store';

type MediaDeletion = { mediaId: string; originalKey: string; attempts: number };
type DeletionDependencies = {
  removeObject: (key: string) => Promise<void>;
  listObjects: (prefix: string) => Promise<Array<{ key: string }>>;
  removeCache: (key: string) => Promise<void>;
  complete: (mediaId: string) => Promise<void>;
  retry: (mediaId: string, attempts: number, availableAt: Date) => Promise<void>;
  now: () => Date;
};

const deletionDependencies: DeletionDependencies = {
  removeObject: (key) => objectStore.remove(key),
  listObjects: (prefix) => objectStore.list(prefix),
  removeCache: cacheRemove,
  complete: async (mediaId) => {
    await prisma.mediaDeletion.delete({ where: { mediaId } });
  },
  retry: async (mediaId, attempts, availableAt) => {
    await prisma.mediaDeletion.update({ where: { mediaId }, data: { attempts, availableAt } });
  },
  now: () => new Date(),
};

const deletionRetryAt = (attempts: number, now: Date): Date =>
  new Date(now.getTime() + Math.min(300_000, 5000 * 2 ** Math.min(attempts - 1, 6)));

export const cleanupMediaDeletion = async (
  deletion: MediaDeletion,
  dependencies: DeletionDependencies = deletionDependencies,
): Promise<void> => {
  try {
    await dependencies.removeObject(deletion.originalKey);
    const derivatives = await dependencies.listObjects(`derivatives/${deletion.mediaId}/`);
    for (const derivative of derivatives) {
      await dependencies.removeObject(derivative.key);
      await dependencies.removeCache(derivative.key);
    }
    await dependencies.complete(deletion.mediaId);
  } catch {
    const attempts = deletion.attempts + 1;
    await dependencies.retry(deletion.mediaId, attempts, deletionRetryAt(attempts, dependencies.now()));
  }
};

export const cleanupMediaDeletions = async (): Promise<void> => {
  const deletions = await prisma.mediaDeletion.findMany({
    where: { availableAt: { lte: new Date() } },
    orderBy: { availableAt: 'asc' },
  });
  for (const deletion of deletions) await cleanupMediaDeletion(deletion);
};

export const cleanupUnlinkedUploads = async (): Promise<void> => {
  const expired = await prisma.uploadIntent.findMany({
    where: { status: 'pending', expiresAt: { lt: new Date() } },
    select: { id: true, objectKey: true },
  });
  for (const intent of expired) {
    await objectStore.remove(intent.objectKey).catch(() => undefined);
    await prisma.uploadIntent.update({ where: { id: intent.id }, data: { status: 'expired' } });
  }

  const [objects, media, intents] = await Promise.all([
    objectStore.list('originals/'),
    prisma.mediaAsset.findMany({ select: { originalKey: true } }),
    prisma.uploadIntent.findMany({ where: { status: 'pending' }, select: { objectKey: true, expiresAt: true } }),
  ]);
  const referenced = new Set([...media.map((item) => item.originalKey), ...intents.map((item) => item.objectKey)]);
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const object of objects) {
    if (!referenced.has(object.key) && object.lastModified.getTime() < cutoff) {
      await objectStore.remove(object.key).catch(() => undefined);
    }
  }
};
