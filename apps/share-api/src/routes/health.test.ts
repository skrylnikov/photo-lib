import assert from 'node:assert/strict';
import test from 'node:test';

import fastify from 'fastify';

import {
  requiredCodecCapabilities,
  type CodecCapabilities,
} from '../media/codec-runtime';
import { registerHealthRoutes } from './health';

const completeCapabilities = (): CodecCapabilities => Object.fromEntries(
  requiredCodecCapabilities.map((capability) => [capability, true]),
) as CodecCapabilities;

test('keeps health live and reports readiness from the startup codec snapshot', async () => {
  const readyApp = fastify();
  registerHealthRoutes(readyApp, {}, completeCapabilities());
  assert.equal((await readyApp.inject('/health')).statusCode, 200);
  assert.deepEqual((await readyApp.inject('/ready')).json(), { status: 'ready' });
  await readyApp.close();

  const incomplete = completeCapabilities();
  incomplete['output:hevc'] = false;
  const unreadyApp = fastify();
  registerHealthRoutes(unreadyApp, {}, incomplete);
  assert.equal((await unreadyApp.inject('/health')).statusCode, 200);
  const response = await unreadyApp.inject('/ready');
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    status: 'not_ready',
    missingCapabilities: ['output:hevc'],
  });
  await unreadyApp.close();
});
