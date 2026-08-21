import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecVersionDiagnostics, probeInstalledCodecRuntime, requiredCodecCapabilities } from './codec-runtime';
import { MediaValidationError, validateOriginal } from './formats';

const fixtureDirectory = fileURLToPath(new URL('../../../../test-fixtures/heic/', import.meta.url));

const main = async (): Promise<void> => {
  const hevc = await readFile(join(fixtureDirectory, 'tiled-6x8.heic'));
  const overBudget = await readFile(join(fixtureDirectory, 'tiled-17x16-over-budget.heic'));
  const [versions, capabilities] = await Promise.all([
    codecVersionDiagnostics(),
    probeInstalledCodecRuntime(hevc),
  ]);

    const validated = await validateOriginal(hevc);
    if (validated.format !== 'heif' || validated.width !== 384 || validated.height !== 512) {
      throw new Error('tiled_hevc_validation_failed');
    }
    try {
      await validateOriginal(overBudget);
      throw new Error('over_budget_heif_accepted');
    } catch (error) {
      if (!(error instanceof MediaValidationError) || error.safeCode !== 'heif_complexity_limit_exceeded') {
        throw new Error('over_budget_heif_classification_failed', { cause: error });
      }
    }

    console.log(JSON.stringify({ versions, capabilities, tiledHevc: validated }));
    if (requiredCodecCapabilities.some((capability) => !capabilities[capability])) {
      process.exitCode = 1;
    }
};

await main();
