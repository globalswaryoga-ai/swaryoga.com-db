// Phone normalization utilities used across CRM (server + client)
// Desired storage format: digits-only with country code prefixed (e.g. India: 919309986820)

export type NormalizePhoneOptions = {
  /** Default country code when user provides a 10-digit local number. Default: "91" */
  defaultCountryCode?: string;
};

export type NormalizePhoneResult =
  | { ok: true; phone: string }
  | { ok: false; error: string };

function digitsOnly(input: string): string {
  return input.replace(/\D+/g, '');
}

/**
 * Normalize arbitrary phone input into digits-only with country code (no +).
 *
 * Accepts:
 * - "919309986820" (already OK)
 * - "+91 93099 86820"
 * - "0919309986820" (leading 0 trunk removed)
 * - "9309986820" (adds default country code)
 *
 * Rejects empty, too short, too long, or obviously invalid values.
 */
export function normalizePhoneStrict(rawValue: unknown, opts: NormalizePhoneOptions = {}): NormalizePhoneResult {
  const defaultCC = String(opts.defaultCountryCode || '91').trim();
  if (!/^\d{1,4}$/.test(defaultCC)) {
    return { ok: false, error: 'Invalid default country code' };
  }

  const raw = String(rawValue ?? '').trim();
  if (!raw) return { ok: false, error: 'Missing phone number' };

  // Keep digits only.
  let digits = digitsOnly(raw);

  // Remove common trunk prefixes like 00, 0 (for inputs like 0091..., 091...)
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length > 10) digits = digits.replace(/^0+/, '');

  // If user provided 10-digit local number, prepend default CC.
  if (digits.length === 10) {
    digits = `${defaultCC}${digits}`;
  }

  // Basic length sanity. E.164 max is 15 digits.
  if (digits.length < 11) {
    return { ok: false, error: 'Phone number too short' };
  }
  if (digits.length > 15) {
    return { ok: false, error: 'Phone number too long' };
  }

  // For India specifically, enforce 91 + 10 digits when CC is 91.
  if (defaultCC === '91') {
    if (!digits.startsWith('91')) {
      return { ok: false, error: 'Phone number must include country code (91...)' };
    }
    if (digits.length !== 12) {
      return { ok: false, error: 'Indian phone numbers must be 12 digits (91 + 10 digits)' };
    }
  }

  return { ok: true, phone: digits };
}
