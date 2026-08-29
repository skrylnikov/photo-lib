import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import Database from 'better-sqlite3';

import type { ObjectStore } from './storage/object-store';
import { backupSqlite } from './backup';

test('uploads a valid SQLite snapshot and removes only expired backups', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'photo-library-backup-test-'));
  const databasePath = join(directory, 'source.db');
  const temporaryPath = join(directory, 'tmp');
  const source = new Database(databasePath);
  source.exec('CREATE TABLE photos (id TEXT PRIMARY KEY); INSERT INTO photos VALUES (\'photo-1\')');
  source.close();

  const removed: string[] = [];
  let uploaded: Uint8Array | undefined;
  const now = new Date('2026-08-30T01:30:00.000Z');
  const store: Pick<ObjectStore, 'put' | 'list' | 'remove'> = {
    async put(_key, body) {
      uploaded = new Uint8Array(await new Response(body).arrayBuffer());
    },
    list: () => Promise.resolve([
      { key: 'backups/sqlite/old.db', lastModified: new Date('2026-07-01T00:00:00.000Z') },
      { key: 'backups/sqlite/recent.db', lastModified: new Date('2026-08-29T00:00:00.000Z') },
    ]),
    remove: (key) => {
      removed.push(key);
      return Promise.resolve();
    },
  };

  try {
    const key = await backupSqlite({ databasePath, temporaryPath, store, now });
    assert.equal(key, 'backups/sqlite/2026-08-30T01:30:00.000Z.db');
    assert.deepEqual(removed, ['backups/sqlite/old.db']);
    assert.ok(uploaded);

    const restoredPath = join(directory, 'restored.db');
    await writeFile(restoredPath, uploaded);
    const restored = new Database(restoredPath, { readonly: true, fileMustExist: true });
    assert.equal(restored.pragma('quick_check', { simple: true }), 'ok');
    const photo = restored.prepare('SELECT id FROM photos').get() as { id: string } | undefined;
    assert.equal(photo?.id, 'photo-1');
    restored.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
