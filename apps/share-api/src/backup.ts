import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';

import Database from 'better-sqlite3';

import { appConfig } from 'config';

import { objectStore, type ObjectStore } from './storage/object-store';

const backupPrefix = 'backups/sqlite/';
const retentionMs = 30 * 24 * 60 * 60 * 1000;

type BackupStore = Pick<ObjectStore, 'put' | 'list' | 'remove'>;

export const backupSqlite = async ({
  databasePath = appConfig.databasePath,
  temporaryPath = appConfig.tmpPath,
  store = objectStore,
  now = new Date(),
}: {
  databasePath?: string;
  temporaryPath?: string;
  store?: BackupStore;
  now?: Date;
} = {}): Promise<string> => {
  await mkdir(temporaryPath, { recursive: true });
  const directory = await mkdtemp(join(temporaryPath, 'sqlite-backup-'));
  const destination = join(directory, 'photo-library.db');
  const source = new Database(databasePath, { readonly: true, fileMustExist: true });

  try {
    await source.backup(destination);
    const snapshot = new Database(destination, { readonly: true, fileMustExist: true });
    try {
      if (snapshot.pragma('quick_check', { simple: true }) !== 'ok') {
        throw new Error('sqlite_backup_quick_check_failed');
      }
    } finally {
      snapshot.close();
    }

    const key = `${backupPrefix}${now.toISOString()}.db`;
    const bytes = (await stat(destination)).size;
    const body = Readable.toWeb(createReadStream(destination)) as ReadableStream<Uint8Array>;
    await store.put(key, body, 'application/vnd.sqlite3', bytes);

    const cutoff = now.getTime() - retentionMs;
    const expired = (await store.list(backupPrefix)).filter(
      (item) => item.key !== key && item.lastModified.getTime() < cutoff,
    );
    await Promise.all(expired.map((item) => store.remove(item.key)));
    return key;
  } finally {
    source.close();
    await rm(directory, { recursive: true, force: true });
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  backupSqlite()
    .then((key) => {
      console.info(`SQLite backup uploaded: ${basename(key)}`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'sqlite_backup_failed');
      process.exitCode = 1;
    });
}
