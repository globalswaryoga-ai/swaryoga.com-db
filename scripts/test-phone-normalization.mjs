/*
  Quick regression script for CRM phone normalization.
  Run with: node scripts/test-phone-normalization.mjs

  Note: This project uses TypeScript source files. This script inlines the same normalization
  logic so it can run without a TS runtime.
*/

function digitsOnly(input) {
  return String(input).replace(/\D+/g, '');
}

function normalizePhoneStrict(rawValue, opts = {}) {
  const defaultCC = String(opts.defaultCountryCode || '91').trim();
  if (!/^\d{1,4}$/.test(defaultCC)) {
    return { ok: false, error: 'Invalid default country code' };
  }

  const raw = String(rawValue ?? '').trim();
  if (!raw) return { ok: false, error: 'Missing phone number' };

  let digits = digitsOnly(raw);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length > 10) digits = digits.replace(/^0+/, '');

  if (digits.length === 10) {
    digits = `${defaultCC}${digits}`;
  }

  if (digits.length < 11) return { ok: false, error: 'Phone number too short' };
  if (digits.length > 15) return { ok: false, error: 'Phone number too long' };

  if (defaultCC === '91') {
    if (!digits.startsWith('91')) return { ok: false, error: 'Phone number must include country code (91...)' };
    if (digits.length !== 12) return { ok: false, error: 'Indian phone numbers must be 12 digits (91 + 10 digits)' };
  }

  return { ok: true, phone: digits };
}

const samples = [
  ['919309986820', '919309986820'],
  ['+91 93099 86820', '919309986820'],
  ['+91-93099-86820', '919309986820'],
  ['9309986820', '919309986820'],
  ['0919309986820', '919309986820'],
  ['00919309986820', '919309986820'],
];

const bad = ['', '123', '+1 202 555 0101', '91930998682', '91930998682099'];

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} expected ${expected} but got ${actual}`);
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
