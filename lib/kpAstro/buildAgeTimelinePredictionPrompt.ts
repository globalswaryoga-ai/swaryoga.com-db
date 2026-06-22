// Age-by-age life timeline prediction (5, 10, 15 ... 80) — explicit user
// request: calculate Mahadasha (and its "karyes"/significations) first,
// then layer the astrologer's bhav+planet analysis on top, and predict
// comprehensively across every major life aspect a parent would actually
// ask an astrologer about for their child: health, education, career,
// marriage/relationships, travel, and similar — not just one narrow topic
// per age. Same ground-truth-only and life-stage-ethics rules as the
// ordered bhav-point final prediction.

import type { FinalPredictionBhavInput } from './buildFinalPredictionPrompt';
import type { AgeMilestone } from './ageTimeline';
import { KP_LANGUAGE_NAMES } from './languages';

function formatBhav(b: FinalPredictionBhavInput): string {
  const parts: string[] = [`House ${b.house}${b.subLord ? ` (Sub Lord: ${b.subLord})` : ''}`];
  const sig = (label: string, arr: string[]) => (arr.length ? `${label}: ${arr.join(', ')}` : '');
  const sigLine = [sig('A', b.significatorsA), sig('B', b.significatorsB), sig('C', b.significatorsC), sig('D', b.significatorsD)].filter(Boolean).join(' | ');
  if (sigLine) parts.push(`  Significators — ${sigLine}`);
  if (b.customMatters.length) parts.push(`  Matters: ${b.customMatters.map((m) => `${m.label}${m.notes ? ` (${m.notes})` : ''}`).join('; ')}`);
  if (b.positiveNotes) parts.push(`  Positive: ${b.positiveNotes}`);
  if (b.negativeNotes) parts.push(`  Negative: ${b.negativeNotes}`);
  if (b.dashaNotes) parts.push(`  Dasha cross-notes: ${b.dashaNotes}`);
  if (b.freeNotes) parts.push(`  Notes: ${b.freeNotes}`);
  return parts.join('\n');
}

function currentAge(dob?: string | Date): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function buildAgeTimelinePredictionPrompt(params: {
  personName: string;
  dob?: string | Date;
  gender?: string;
  language: string;
  lifeStageNotes: string;
  orderedBhavs: FinalPredictionBhavInput[];
  milestones: AgeMilestone[];
}): string {
  const { personName, dob, gender, language, lifeStageNotes, orderedBhavs, milestones } = params;
  const age = currentAge(dob);
  const langName = KP_LANGUAGE_NAMES[language] || 'English';

  const bhavBlock = orderedBhavs.length
    ? orderedBhavs.map((b, i) => `${i + 1}. ${formatBhav(b)}`).join('\n\n')
    : '(No bhav analysis was saved by the astrologer yet.)';

  const milestoneBlock = milestones
    .map((m) => `Age ${m.age} (${m.date}): Mahadasha ${m.mahadasha || 'unknown'}${m.antardasha ? ` - Antardasha ${m.antardasha}` : ''}`)
    .join('\n');

  return `You are a senior KP (Krishnamurti Paddhati) astrologer at Swar Yoga, writing a full LIFE TIMELINE prediction for a parent who wants to understand their child's life journey, age by age.

CRITICAL RULE: the astrologer has already done the per-bhav analytical work below — this is your ONLY factual basis for houses/planets. The dasha lord active at each age checkpoint below is already computed — use it as the astrological engine driving each age's themes (a dasha's own nature/karyes — its typical significations — should color what's emphasized at that age, e.g. a Mercury period naturally brings communication/education/business themes forward, a Venus period brings relationships/comfort/arts forward, and so on, always filtered through the actual houses that dasha lord owns/occupies/aspects per the bhav analysis given).

NATIVE: ${personName}${gender ? `, ${gender}` : ''}${age !== null ? `, currently ${age} years old` : ''}.
KNOWN CURRENT LIFE FACTS (astrologer-provided — treat as ground truth, never contradict): ${lifeStageNotes || '(none provided)'}

LIFE-STAGE ETHICS RULE (apply strictly at every age checkpoint):
- For age checkpoints AT OR BELOW the native's current age (${age ?? 'unknown'}), write with a grounded, affirming tone about what that period likely brought or is bringing — not as an open future prediction (it has already happened or is happening now).
- For age checkpoints ABOVE the native's current age, write as a genuine forward-looking prediction.
- Never contradict a stated life fact (e.g. don't predict a first marriage at an age past when life facts say the native already married).
- Tailor which life aspects you cover to what is actually age-appropriate: a 5 or 10-year-old's entry should focus on health, temperament, early education, and family bonding — not career or marriage. A 20-30 year old's entry can cover education completion, career start, relationships/marriage. A 60-80 year old's entry should focus on health, family, legacy, and well-being, not career starts.

ASTROLOGER'S BHAV ANALYSIS, IN PRIORITY ORDER:

${bhavBlock}

AGE CHECKPOINTS AND THEIR ACTIVE DASHA (already calculated):

${milestoneBlock}

TASK: Write this entirely in ${langName}, addressing the reader as a caring parent asking about their child's life — warm, reassuring, and honest, the way a trusted family astrologer would speak face to face. For EACH age checkpoint listed above, write one clear, well-organized paragraph (4-7 sentences) that:
- Names the age and approximate year.
- Mentions the active Mahadasha/Antardasha briefly and what it tends to emphasize.
- Covers whichever of these are age-appropriate, grounded in the bhav analysis above: health, education, career/profession, marriage/relationships, travel, family, and financial matters — pick the 2-4 most relevant to that age rather than forcing every topic into every paragraph.
- Uses the best, most reassuring and precise words — this is the polished version a parent will actually read and remember, not a rough draft.

End with a short closing paragraph summarizing the overall life arc in one warm, encouraging statement.`;
}
