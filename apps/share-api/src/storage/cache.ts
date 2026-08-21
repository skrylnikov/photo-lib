import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { appConfig } from 'config';

type CacheEntry = { file: string; bytes: number; lastAccess: number };
type CacheIndex = Record<string, CacheEntry>;

const indexPath = join(appConfig.cache.path, '.index.json');
let index: CacheIndex | undefined;
let cacheOperation: Promise<void> = Promise.resolve();

const withCacheLock = <T>(operation: () => Promise<T>): Promise<T> => {
  const current = cacheOperation.then(operation, operation);
  cacheOperation = current.then(() => undefined, () => undefined);
  return current;
};

const fileFor = (key: string): string =>
  join(appConfig.cache.path, `${createHash('sha256').update(key).digest('hex')}.derivative`);

const loadIndex = async (): Promise<CacheIndex> => {
  if (index) return index;
  try {
    index = JSON.parse(await readFile(indexPath, 'utf8')) as CacheIndex;
  } catch {
    index = {};
  }
  return index;
};

const saveIndex = async (): Promise<void> => {
  const temporary = `${indexPath}.tmp`;
  await writeFile(temporary, JSON.stringify(index), 'utf8');
  await rename(temporary, indexPath);
};

const removeEntry = (entries: CacheIndex, key: string): CacheIndex => {
  const next = Object.fromEntries(Object.entries(entries).filter(([entryKey]) => entryKey !== key));
  index = next;
  return next;
};

const evict = async (initialEntries: CacheIndex): Promise<void> => {
  let entries = initialEntries;
  let total = Object.values(entries).reduce((sum, entry) => sum + entry.bytes, 0);
  if (total <= appConfig.cache.highWaterBytes) return;

  const ordered = Object.entries(entries).sort(([, left], [, right]) =>
    left.lastAccess - right.lastAccess,
  );
  for (const [key, entry] of ordered) {
    if (total <= appConfig.cache.targetBytes) break;
    await rm(entry.file, { force: true });
    entries = removeEntry(entries, key);
    total -= entry.bytes;
  }
};

export const ensureCache = (): Promise<void> => withCacheLock(async () => {
  await mkdir(appConfig.cache.path, { recursive: true });
  const entries = await loadIndex();
  await evict(entries);
  await saveIndex();
});

export const cacheGet = (key: string): Promise<Buffer | null> => withCacheLock(async () => {
  const entries = await loadIndex();
  if (!Object.hasOwn(entries, key)) return null;
  const entry = entries[key];
  try {
    const value = await readFile(entry.file);
    entry.lastAccess = Date.now();
    await saveIndex();
    return value;
  } catch {
    removeEntry(entries, key);
    await saveIndex();
    return null;
  }
});

export const cachePut = (key: string, value: Uint8Array): Promise<void> => withCacheLock(async () => {
  if (value.byteLength > appConfig.cache.maxBytes) return;
  const entries = await loadIndex();
  await mkdir(appConfig.cache.path, { recursive: true });
  const file = fileFor(key);
  const temporary = `${file}.tmp`;
  await writeFile(temporary, value);
  await rename(temporary, file);
  entries[key] = { file, bytes: value.byteLength, lastAccess: Date.now() };
  await evict(entries);
  await saveIndex();
});

export const cacheStats = (): Promise<{ entries: number; bytes: number }> => withCacheLock(async () => {
  const entries = await loadIndex();
  const live = await Promise.all(
    Object.entries(entries).map(async ([key, entry]) => {
      try {
        const current = await stat(entry.file);
        return [key, { ...entry, bytes: current.size }] as const;
      } catch {
        return null;
      }
    }),
  );
  const next = Object.fromEntries(live.filter((item): item is readonly [string, CacheEntry] => item !== null));
  index = next;
  await saveIndex();
  return {
    entries: Object.keys(next).length,
    bytes: Object.values(next).reduce((sum, entry) => sum + entry.bytes, 0),
  };
});
