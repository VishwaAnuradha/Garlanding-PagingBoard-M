import test from 'node:test';
import assert from 'node:assert/strict';

import { getApplicationRole, login } from '../controllers/authController.js';

test('UCFE role IDs map to application roles', () => {
  assert.equal(getApplicationRole(1), 'admin');
  assert.equal(getApplicationRole(2), 'staff');
  assert.equal(getApplicationRole(3), 'superAdmin');
  assert.equal(getApplicationRole(4), 'superAdmin');
  assert.equal(getApplicationRole(99), null);
});

test('login requires SSN and password', async () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await login({ body: { ssn: '', password: 'N', shift: 'Shift A' } }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'SSN, password, and airport are required.');
});
