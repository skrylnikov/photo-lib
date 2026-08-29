import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSrcSet } from './picture-srcset';

test('builds an ordered responsive width srcset', () => {
  assert.equal(
    buildSrcSet([
      { width: 2560, url: '/image-2560.jpeg' },
      { width: 640, url: '/image-640.jpeg' },
      { width: 1280, url: '/image-1280.jpeg' },
    ]),
    '/image-640.jpeg 640w, /image-1280.jpeg 1280w, /image-2560.jpeg 2560w',
  );
});
