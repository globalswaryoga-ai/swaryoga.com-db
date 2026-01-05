export type LabelColor = 'blue' | 'yellow' | 'green' | 'red';

export type CanonicalLabel =
  | 'New'
  | 'Old'
  | 'Repeater'
  | 'WhatsApp sent'
  | 'WhatsApp replied'
  | 'Active'
  | 'Sent message for calling'
  | 'Ready to call'
  | 'Call done'
  | 'Interested for workshop'
  | 'No reply'
  | 'Hot Lead'
  | 'Cold lead'
  | 'Dead lead'
  | 'Enrolled';

/**
 * Canonical label list to use everywhere in the CRM.
 * NOTE: Keep both casing and spelling stable for consistent filtering.
 */
export const CANONICAL_LABELS: CanonicalLabel[] = [
  'New',
  'Old',
  'Repeater',
  'WhatsApp sent',
  'WhatsApp replied',
  'Active',
  'Sent message for calling',
  'Ready to call',
  'Call done',
  'Interested for workshop',
  'No reply',
  'Hot Lead',
  'Cold lead',
  'Dead lead',
  'Enrolled',
];

/**
 * Color mapping (you confirmed this mapping is correct).
 */
export const LABEL_COLORS: Record<CanonicalLabel, LabelColor> = {
  // Blue = neutral/info
  New: 'blue',
  Old: 'blue',
  Repeater: 'blue',
  'WhatsApp sent': 'blue',
  Active: 'blue',
  'Ready to call': 'blue',
  'Sent message for calling': 'blue',

  // Yellow = warm/needs attention
  'Interested for workshop': 'yellow',
  'Hot Lead': 'yellow',

  // Green = positive/success
  'WhatsApp replied': 'green',
  'Call done': 'green',
  Enrolled: 'green',

  // Red = negative/no-go
  'No reply': 'red',
  'Cold lead': 'red',
  'Dead lead': 'red',
};

export function normalizeLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  // Backward-compatible normalization for legacy/typo variants.
  // (We keep DB values as-is, but standardize what the UI/API treat as canonical.)
  const lower = raw.toLowerCase();
  const map: Record<string, string> = {
    // WhatsApp casing
    'whatsapp sent': 'WhatsApp sent',
    'whatsapp replied': 'WhatsApp replied',
    'whatsapp reply': 'WhatsApp replied',
    'whatsapp replyed': 'WhatsApp replied',
    // common typos/casing
    'cold lead': 'Cold lead',
    'dead lead': 'Dead lead',
    'no reply': 'No reply',
  };

  return map[lower] || raw;
}

export function isCanonicalLabel(value: unknown): value is CanonicalLabel {
  const v = normalizeLabel(value);
  return (CANONICAL_LABELS as string[]).includes(v);
}

export function getLabelColor(label: unknown): LabelColor {
  const v = normalizeLabel(label);
  if (isCanonicalLabel(v)) return LABEL_COLORS[v];
  // Unknown legacy labels default to blue.
  return 'blue';
}

/**
 * Merge canonical options with any existing DB-provided labels.
 * If you want to "remove old labels" from selection UI, set includeLegacy=false.
 */
export function buildLabelOptions(opts?: { existing?: string[]; includeLegacy?: boolean }): string[] {
  const existing = Array.isArray(opts?.existing) ? opts!.existing!.map(normalizeLabel).filter(Boolean) : [];
  const includeLegacy = opts?.includeLegacy ?? false;

  const base = [...CANONICAL_LABELS];
  if (!includeLegacy) return base;

  const extra = existing.filter((l) => !base.includes(l as any));
  return Array.from(new Set([...base, ...extra]));
}
