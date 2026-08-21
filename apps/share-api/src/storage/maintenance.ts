import { prisma } from 'database';

import { objectStore } from './object-store';

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
