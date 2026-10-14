/**
 * Suggests Google Form question → CRM field mappings.
 *
 * A batch with an empty `metadata.googleFormMapping` renders every configured
 * CRM field as "-- Ignore --", which is what makes saved form fields look like
 * they were dropped. These helpers auto-fill a mapping from the live question
 * titles so a connected form always has a sensible mapping.
 *
 * Mapping values are question *titles*, matching what the mapping dropdown
 * stores and what `mapGoogleFormResponses` writes into `dynamicAnswers`
 * and `_rawRecord`.
 */

export type CrmFieldDefinition = { id: string; label: string };

const FIELD_KEYWORDS: Record<string, string[]> = {
  name: ['full name', 'your name', 'name', 'first name', 'naam', 'pura naam', 'poora naam', 'नाम', 'नाव'],
  email: ['email address', 'email', 'e-mail', 'mail', 'ईमेल'],
  mobile: ['whatsapp number', 'mobile number', 'phone number', 'whatsapp', 'mobile', 'phone', 'contact number', 'contact', 'नंबर', 'नम्बर'],
  city: ['city', 'town', 'location', 'शहर', 'adress', 'address'],
  country: ['country', 'nation', 'देश'],
  gender: ['gender', 'sex', 'लिंग', 'i am'],
  ai7: ['workshop date', 'workshop month', 'which workshop', 'batch name', 'batch', 'ai-7', 'ai7', 'join 14 days', 'join 14 days live workshop'],
};

function canonicalFieldKey(id: string): string {
  return String(id || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Higher is a better match; 0 means "not this question". */
function scoreTitle(title: string, keyword: string): number {
  const text = title.trim().toLowerCase();
  if (!text) return 0;
  if (text === keyword) return 4;
  if (text.startsWith(keyword)) return 3;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`(?:^|\\W)${escaped}(?:\\W|$)`).test(text)) return 2;
  if (keyword.length > 4 && text.includes(keyword)) return 1;
  return 0;
}

/** One suggested question title per CRM field, never reusing a question. */
export function suggestGoogleFormMapping(
  crmFields: CrmFieldDefinition[],
  questionMap: Record<string, string>,
): Record<string, string> {
  const titles = [...new Set(Object.values(questionMap || {}).map(String).map(title => title.trim()).filter(Boolean))];
  const taken = new Set<string>();
  const mapping: Record<string, string> = {};

  for (const field of crmFields || []) {
    const keywords = FIELD_KEYWORDS[canonicalFieldKey(field?.id)];
    if (!keywords) continue;
    let bestTitle = '';
    let bestScore = 0;
    for (const keyword of keywords) {
      for (const title of titles) {
        if (taken.has(title)) continue;
        const score = scoreTitle(title, keyword);
        if (score > bestScore) {
          bestScore = score;
          bestTitle = title;
        }
      }
      if (bestScore >= 4) break;
    }
    if (bestTitle) {
      mapping[field.id] = bestTitle;
      taken.add(bestTitle);
    }
  }
  return mapping;
}

/**
 * Keeps every mapping the user already chose and fills the remaining fields
 * from the suggested mapping. Fields with no matching question stay unmapped
 * and therefore render as "-- Ignore --" rather than guessing.
 */
export function completeGoogleFormMapping(
  crmFields: CrmFieldDefinition[],
  questionMap: Record<string, string>,
  existing?: Record<string, string> | null,
): Record<string, string> {
  const suggested = suggestGoogleFormMapping(crmFields, questionMap);
  const assigned = new Set(
    Object.values(existing || {}).map(String).map(value => value.trim()).filter(Boolean),
  );
  const mapping: Record<string, string> = {};
  for (const field of crmFields || []) {
    const preset = String(existing?.[field.id] || '').trim();
    if (preset) {
      mapping[field.id] = preset;
      continue;
    }
    const candidate = suggested[field.id];
    if (candidate && !assigned.has(candidate)) {
      mapping[field.id] = candidate;
      assigned.add(candidate);
    }
  }
  return mapping;
}

/** CRM fields that a mapping does not cover, in display order. */
export function unmappedCrmFields(
  crmFields: CrmFieldDefinition[],
  mapping: Record<string, string> | null | undefined,
): CrmFieldDefinition[] {
  return (crmFields || []).filter(field => !String(mapping?.[field.id] || '').trim());
}
