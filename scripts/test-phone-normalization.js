// Quick regression check for CRM phone normalization.
// Run: node scripts/test-phone-normalization.js

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// Keep this in sync with lib/crm/phone.ts normalizePhoneStrict
const digitsOnly = (s) => String(s || '').replace(/\D+/g, '');

function normalizePhoneStrict(rawValue, { defaultCountryCode = '91' } = {}) {
  const raw = String(rawValue ?? '').trim();
  if (!raw) return { ok: false, error: 'Missing phone number' };

  let digits = digitsOnly(raw);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length > 10) digits = digits.replace(/^0+/, '');
  if (digits.length === 10) digits = `${defaultCountryCode}${digits}`;

  if (digits.length < 11) return { ok: false, error: 'Phone number too short' };
  if (digits.length > 15) return { ok: false, error: 'Phone number too long' };

  if (defaultCountryCode === '91') {
    if (!digits.startsWith('91')) return { ok: false, error: 'Phone number must include country code (91...)' };
    if (digits.length !== 12) return { ok: false, error: 'Indian phone numbers must be 12 digits (91 + 10 digits)' };
  }

  return { ok: true, phone: digits };
}

const cases = [
  ['+91 98765 43210', '919876543210'],
  ['91-9876543210', '919876543210'],
  ['9876543210', '919876543210'],
  ['0091 9876543210', '919876543210'],
  ['0919876543210', '919876543210'],
];

for (const [input, expected] of cases) {
  const res = normalizePhoneStrict(input, { defaultCountryCode: '91' });
  assert(res.ok, `Expected ok for ${input}, got error=${res.error}`);
  assert(res.phone === expected, `Expected ${expected} for ${input}, got ${res.phone}`);
}

console.log('✅ phone normalization checks passed');
