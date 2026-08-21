import { prisma } from 'database';
import { appConfig } from 'config';

import { processMedia } from './processor';
import { cleanupUnlinkedUploads } from '../storage/maintenance';
import { failureTransition } from './job-state';

let runnerStarted = false;
let lastCleanupAt = 0;

const recoverExpired = async (): Promise<void> => {
  const now = new Date();
  await prisma.mediaJob.updateMany({
    where: { status: 'processing', leaseExpiresAt: { lt: now } },
    data: { status: 'pending', leaseExpiresAt: null, availableAt: now },
  });
};

const claim = async () => {
  const job = await prisma.mediaJob.findFirst({
    where: { status: 'pending', availableAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
  });
  if (!job) return null;
  const now = new Date();
  const result = await prisma.mediaJob.updateMany({
    where: { id: job.id, status: 'pending' },
    data: {
      status: 'processing',
      attempts: { increment: 1 },
      startedAt: now,
      leaseExpiresAt: new Date(now.getTime() + appConfig.media.leaseSeconds * 1000),
    },
  });
  return result.count === 1 ? job : null;
};

const safeError = (error: unknown): string => {
  if (error instanceof Error && /^[a-z0-9_:-]+$/.test(error.message)) return error.message;
  return 'media_processing_failed';
};

const execute = async (job: NonNullable<Awaited<ReturnType<typeof claim>>>): Promise<void> => {
  await prisma.mediaAsset.update({ where: { id: job.mediaId }, data: { status: 'processing' } });
  try {
    await processMedia(job.mediaId);
    await prisma.mediaJob.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date(), leaseExpiresAt: null },
    });
  } catch (error) {
    const message = safeError(error);
    const transition = failureTransition(job.attempts, job.maxAttempts);
    await prisma.$transaction([
      prisma.mediaJob.update({
        where: { id: job.id },
        data: {
          status: transition.jobStatus,
          safeError: message,
          leaseExpiresAt: null,
          availableAt: transition.availableAt,
        },
      }),
      prisma.mediaAsset.update({
        where: { id: job.mediaId },
        data: { status: transition.mediaStatus, safeError: transition.terminal ? message : null },
      }),
    ]);
  }
};

const loop = async (): Promise<void> => {
  await recoverExpired();
  if (Date.now() - lastCleanupAt >= 60_000) {
    lastCleanupAt = Date.now();
    await cleanupUnlinkedUploads().catch(() => undefined);
  }
  const job = await claim();
  if (job) await execute(job);
  setTimeout(() => void loop(), job ? 0 : 1000);
};

export const startJobRunner = (): void => {
  if (runnerStarted) return;
  runnerStarted = true;
  void loop();
};

export const recoverJobs = recoverExpired;
