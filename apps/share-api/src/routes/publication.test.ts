import assert from 'node:assert/strict';
import test from 'node:test';

import { isPubliclyVisibleMedia } from './publication';

test('keeps pending and failed media outside public publication', () => {
  assert.equal(isPubliclyVisibleMedia('pending', true), false);
  assert.equal(isPubliclyVisibleMedia('processing', true), false);
  assert.equal(isPubliclyVisibleMedia('failed', true), false);
  assert.equal(isPubliclyVisibleMedia('ready', false), false);
  assert.equal(isPubliclyVisibleMedia('ready', true), true);
});
