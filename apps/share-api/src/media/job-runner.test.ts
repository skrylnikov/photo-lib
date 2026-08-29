import assert from 'node:assert/strict';
import test from 'node:test';

import { runJobRunnerIteration } from './job-runner';

test('continues after a pre-claim infrastructure failure without a busy loop', async () => {
  let attempts = 0;
  let completedJobs = 0;
  const errors: unknown[] = [];
  const scheduled: Array<{ callback: () => void; delay: number }> = [];
  const dependencies = {
    processNextJob: () => {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new Error('temporary_sqlite_failure'));
      completedJobs += 1;
      return Promise.resolve(true);
    },
    reportError: (error: unknown) => errors.push(error),
    schedule: (callback: () => void, delay: number) => scheduled.push({ callback, delay }),
  };

  await runJobRunnerIteration(dependencies);
  assert.equal(errors.length, 1);
  assert.equal(scheduled[0]?.delay, 1000);

  scheduled.shift()?.callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completedJobs, 1);
  assert.equal(scheduled[0]?.delay, 0);
});
