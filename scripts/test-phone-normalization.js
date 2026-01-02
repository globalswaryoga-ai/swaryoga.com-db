/*
  Quick regression script for CRM phone normalization.
  Run with: node scripts/test-phone-normalization.js
*/

const { normalizePhoneStrict } = require('../lib/crm/phone');

const samples = [
  ['919309986820', '919309986820'],
  ['+91 93099 86820', '919309986820'],
  ['+91-93099-86820', '919309986820'],
  ['9309986820', '919309986820'],
  ['0919309986820', '919309986820'],
  ['00919309986820', '919309986820'],
];

const bad = ['','123', '+1 202 555 0101', '91930998682', '91930998682099'];

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected} but got ${actual}`);
  }
}

for (const [input, expected] of samples) {
  const res = normalizePhoneStrict(input, { defaultCountryCode: '91' });
  if (!res.ok) throw new Error(`Expected OK for ${input}, got error: ${res.error}`);
  assertEqual(res.phone, expected, `normalize(${input})`);
}

for (const input of bad) {
  const res = normalizePhoneStrict(input, { defaultCountryCode: '91' });
  if (res.ok) throw new Error(`Expected FAIL for ${JSON.stringify(input)}, got ${res.phone}`);
}

console.log('✅ phone normalization checks passed');
