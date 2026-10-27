import test from 'node:test';
import assert from 'node:assert/strict';

import { getPool, getPoolForAirport, runWithAirportDatabase } from '../config/db.js';

test('keeps the connection pool available after a connection error', () => {
  const pool = getPool();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    pool.emit('error', new Error('Simulated connection error'));
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(getPool(), pool);
});

test('uses the authenticated airport pool inside request database context', async () => {
  const jiaPool = getPoolForAirport('JIA');
  const biaPool = getPoolForAirport('BIA');

  assert.notEqual(jiaPool, biaPool);
  await runWithAirportDatabase('JIA', async () => {
    await Promise.resolve();
    assert.equal(getPool(), jiaPool);
  });
  assert.throws(() => runWithAirportDatabase('UNKNOWN', () => {}), /Unknown airport code/);
});
