import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePaymentFlag } from '../controllers/salesController.js';

test('cash is stored as 0 and card payments are stored as 1', () => {
  assert.equal(normalizePaymentFlag('CASH'), 0);
  assert.equal(normalizePaymentFlag('CARD'), 1);
  assert.equal(normalizePaymentFlag('CREDIT_CARD'), 1);
  assert.equal(normalizePaymentFlag(null), 0);
  assert.equal(normalizePaymentFlag(true), 1);
  assert.equal(normalizePaymentFlag(false), 0);
});
