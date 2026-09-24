import test from 'node:test';
import assert from 'node:assert/strict';
import { contactMatchesRecord } from '../lib/contactDuplicateCheck.ts';

test('matches same email and normalized WhatsApp number', () => {
  assert.equal(
    contactMatchesRecord('demo@swaryoga.com', '+91 98765 43210', {
      email: 'demo@swaryoga.com',
      phone: '919876543210',
    }),
    true,
  );

  assert.equal(
    contactMatchesRecord('demo@swaryoga.com', '+91 98765 43210', {
      email: 'other@swaryoga.com',
      phone: '919876543219',
    }),
    false,
  );

  assert.equal(
    contactMatchesRecord('', '+91 98765 43210', {
      email: 'demo@swaryoga.com',
      phone: '919876543210',
    }),
    true,
  );
});
