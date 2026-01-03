/**
 * Phone normalization helpers.
 *
 * Goal: make numbers safe for Meta WhatsApp Cloud API.
 * Meta expects E.164-like digits ONLY (no '+', spaces, or separators).
 *
 * Current business rule assumption (matches existing codebase behavior):
 * - If input is 10 digits, assume India and prefix '91'.
 * - Otherwise, keep digits-only as provided.
 */

export function normalizePhoneDigitsOnly(input?: string): string {
  return String(input || '').replace(/\D/g, '');
}

export function normalizePhoneForMeta(input?: string): string {
  let digits = normalizePhoneDigitsOnly(input);

  // Common India normalization: 10 digits -> prefix 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  // If already starts with 91 (and likely 12 digits), keep.
  // For other countries, we keep digits-only as-is.
  return digits;
}
