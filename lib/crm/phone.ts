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
export const COUNTRY_DIALING_CODES: Record<string, string> = {
  // Common / Subcontinent & Asia
  india: '91', in: '91', bharat: '91',
  unitedstates: '1', usa: '1', us: '1', america: '1',
  canada: '1', ca: '1',
  unitedkingdom: '44', uk: '44', britain: '44', england: '44', gb: '44',
  australia: '61', au: '61',
  newzealand: '64', nz: '64',
  singapore: '65', sg: '65',
  malaysia: '60', my: '60',
  unitedarabemirates: '971', uae: '971', dubai: '971', ae: '971',
  saudiarabia: '966', ksa: '966', sa: '966',
  qatar: '974', qa: '974',
  oman: '968', om: '968',
  kuwait: '965', kw: '965',
  bahrain: '973', bh: '973',
  nepal: '977', np: '977',
  srilanka: '94', lk: '94',
  bangladesh: '880', bd: '880',
  pakistan: '92', pk: '92',
  germany: '49', de: '49',
  france: '33', fr: '33',
  netherlands: '31', nl: '31',
  switzerland: '41', ch: '41',
  sweden: '46', se: '46',
  norway: '47', no: '47',
  denmark: '45', dk: '45',
  ireland: '353', ie: '353',
  southafrica: '27', za: '27',
  japan: '81', jp: '81',
  southkorea: '82', kr: '82',
  indonesia: '62', id: '62',
  thailand: '66', th: '66',
  philippines: '63', ph: '63',
  vietnam: '84', vn: '84',
  mauritius: '230', mu: '230',
  kenya: '254', ke: '254',
  nigeria: '234', ng: '234',
  italy: '39', it: '39',
  spain: '34', es: '34',
  portugal: '351', pt: '351',
  russia: '7', ru: '7',
  brazil: '55', br: '55',
  mexico: '52', mx: '52',
};

export function getCountryDialingCode(country: unknown): string | null {
  if (!country) return null;
  const key = String(country).toLowerCase().replace(/[^a-z]/g, '');
  return COUNTRY_DIALING_CODES[key] || null;
}

/**
 * Normalizes phone number based on participant's country name.
 * If participant entered 10 digits without country code, it resolves their country.
 */
export function normalizePhoneWithCountry(rawValue: unknown, country?: unknown, defaultCC = '91'): string {
  const raw = String(rawValue ?? '').trim();
  if (!raw) return '';
  let digits = digitsOnly(raw);

  // Strip international trunks
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length > 10) digits = digits.replace(/^0+/, '');

  // Resolve country code from country name
  const resolvedCC = getCountryDialingCode(country) || defaultCC;

  // If already starts with the country's dialing code (and length is appropriate)
  if (resolvedCC && digits.startsWith(resolvedCC) && digits.length >= (resolvedCC.length + 7)) {
    return digits;
  }

  // If number lacks country code (e.g. 10 digits for India/USA/UK, 9 digits for Australia/NZ)
  if (digits.length >= 7 && digits.length <= 10) {
    if (resolvedCC) {
      digits = `${resolvedCC}${digits}`;
    }
  }

  return digits;
}

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
