import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  exceedsHeifComplexityBudget,
  heifItemReferenceBudget,
  inspectHeifContainer,
} from './heif-container';

const fixtureDirectory = fileURLToPath(new URL('../../../../test-fixtures/heic/', import.meta.url));
const fixture = (name: string): Promise<Buffer> => readFile(join(fixtureDirectory, name));

test('6x8 HEVC grid fixture has the expected bounded structure and no user metadata', async () => {
  const value = await fixture('tiled-6x8.heic');
  const inspection = inspectHeifContainer(value);
  assert.equal(inspection.majorBrand, 'heic');
  assert.deepEqual(inspection.compatibleBrands, ['mif1', 'heic', 'miaf']);
  assert.equal(inspection.itemCount, 49);
  assert.equal(inspection.itemTypes.filter((type) => type === 'grid').length, 1);
  assert.equal(inspection.itemTypes.filter((type) => type === 'hvc1').length, 48);
  assert.equal(inspection.itemTypes.some((type) => type === 'Exif' || type === 'mime'), false);
  assert.deepEqual(inspection.references, [{ type: 'dimg', count: 48 }]);
  assert.deepEqual(inspection.grid, { columns: 6, rows: 8, width: 384, height: 512 });
  assert.equal(exceedsHeifComplexityBudget(inspection), false);

  const text = value.toString('latin1').toLowerCase();
  for (const marker of ['exif', 'application/rdf+xml', 'xmp', 'gps']) {
    assert.equal(text.includes(marker), false, `fixture contains forbidden metadata marker: ${marker}`);
  }
});

test('17x16 HEVC grid fixture deterministically exceeds the item/reference budget', async () => {
  const inspection = inspectHeifContainer(await fixture('tiled-17x16-over-budget.heic'));
  assert.equal(inspection.itemCount, 273);
  assert.deepEqual(inspection.references, [{ type: 'dimg', count: 272 }]);
  assert.deepEqual(inspection.grid, { columns: 17, rows: 16, width: 1088, height: 1024 });
  assert.equal(heifItemReferenceBudget, 256);
  assert.equal(exceedsHeifComplexityBudget(inspection), true);
});
