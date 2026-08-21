import assert from 'node:assert/strict';
import test from 'node:test';

import { appRouter } from './index';
import { normalizeAlbumMediaItems } from './admin';

test('admin composition API normalizes ordered items to unique positions', () => {
  assert.deepEqual(normalizeAlbumMediaItems([
    { mediaId: 'media-b', featured: true, position: 99 },
    { mediaId: 'media-a', featured: false, position: 99 },
  ]), [
    { mediaId: 'media-b', featured: true, position: 0 },
    { mediaId: 'media-a', featured: false, position: 1 },
  ]);
});

test('every admin API operation keeps the active-session boundary', async () => {
  const caller = appRouter.createCaller({ req: {} as never, res: {} as never, session: null });
  await assert.rejects(() => caller.admin.listMedia(), { code: 'UNAUTHORIZED' });
  await assert.rejects(() => caller.admin.createUploadIntent({
    originalName: 'synthetic.jpg',
    mime: 'image/jpeg',
    bytes: 1,
    targetAlbumId: null,
  }), { code: 'UNAUTHORIZED' });
});
