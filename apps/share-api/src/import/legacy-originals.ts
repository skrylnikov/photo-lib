import { randomUUID } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { appConfig } from 'config';
import { configureSqlite, prisma } from 'database';

import { validateOriginal } from '../media/formats';
import { objectStore } from '../storage/object-store';

type ImportOptions = { source: string; createdBy: string; dryRun: boolean };

const contentTypeFor = (format: string): string => ({
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  jxl: 'image/jxl',
  heif: 'image/heif',
}[format] ?? 'application/octet-stream');

const parseArgs = (args: string[]): ImportOptions => {
  const valueFor = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const source = valueFor('--source');
  const createdBy = valueFor('--created-by');
  const dryRun = args.includes('--dry-run');
  if (!source || (!createdBy && !dryRun) || (!dryRun && !args.includes('--confirm'))) {
    throw new Error('usage: npm run import:legacy -- --source /path/to/originals --created-by subject --confirm [--dry-run]');
  }
  return { source: resolve(source), createdBy: createdBy ?? 'dry-run', dryRun };
};

const walk = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && !entry.name.startsWith('.')) files.push(path);
  }
  return files;
};

export const importLegacyOriginals = async (options: ImportOptions): Promise<{ imported: number; skipped: number; failed: number }> => {
  const sourceStat = await stat(options.source);
  if (!sourceStat.isDirectory()) throw new Error('source_must_be_directory');
  const files = await walk(options.source);
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const fileStat = await stat(file);
    if (fileStat.size > appConfig.media.maxBytes) {
      skipped += 1;
      continue;
    }
    try {
      const value = await readFile(file);
      const metadata = await validateOriginal(value);
      if (options.dryRun) {
        imported += 1;
        continue;
      }

      const objectKey = `originals/import-${randomUUID()}`;
      await objectStore.put(objectKey, value, contentTypeFor(metadata.format), value.byteLength);
      try {
        await prisma.$transaction(async (transaction) => {
          const media = await transaction.mediaAsset.create({
            data: {
              originalKey: objectKey,
              originalName: basename(file).slice(0, 255),
              originalMime: contentTypeFor(metadata.format),
              originalBytes: value.byteLength,
              width: metadata.width,
              height: metadata.height,
              status: 'pending',
              createdBy: options.createdBy,
            },
          });
          await transaction.mediaJob.create({
            data: { mediaId: media.id, kind: 'process-media', maxAttempts: appConfig.media.maxAttempts },
          });
        });
      } catch (error) {
        await objectStore.remove(objectKey).catch(() => undefined);
        throw error;
      }
      imported += 1;
    } catch {
      failed += 1;
    }
  }
  return { imported, skipped, failed };
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun) await configureSqlite();
  const result = await importLegacyOriginals(options);
  console.log(JSON.stringify(result));
  if (result.failed > 0) process.exitCode = 1;
};

if (process.argv[1]?.endsWith('legacy-originals.ts')) await main();
