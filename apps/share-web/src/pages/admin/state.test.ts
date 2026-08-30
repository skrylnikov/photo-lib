import assert from 'node:assert/strict';
import test from 'node:test';

import { filterMedia, moveItemById } from './state';

test('media search and status filter apply together and can return no matches', () => {
  const media = [
    { originalName: 'Summer Portrait.JPG', status: 'ready' },
    { originalName: 'summer-failed.heic', status: 'failed' },
    { originalName: 'winter.jpg', status: 'ready' },
  ];
  assert.deepEqual(filterMedia(media, 'SUMMER', 'ready'), [media[0]]);
  assert.deepEqual(filterMedia(media, 'missing', 'all'), []);
});

test('item movement preserves all items in the requested order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(moveItemById(items, 'c', 0).map(({ id }) => id), ['c', 'a', 'b']);
  assert.deepEqual(moveItemById(items, 'a', 1).map(({ id }) => id), ['b', 'a', 'c']);
});
