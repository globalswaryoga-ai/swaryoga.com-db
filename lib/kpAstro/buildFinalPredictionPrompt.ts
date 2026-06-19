// Builds the system prompt for the "Final Prediction" step — the step that
// only fires AFTER the astrologer has completed the per-bhav workspace.
// Explicit user requirement: the AI must not blindly predict a life event
// just because a dasha astrologically supports it — it must reconcile that
// against the native's actual current age and any known current life facts
// (e.g. don't predict marriage from a supportive dasha if the native is
// already married; reframe it as e.g. "deepening of married life" instead).

import { KP_LANGUAGE_NAMES } from './languages';

export interface FinalPredictionBhavInput {
  house: number;
  subLord: string;
  significatorsA: string[];
  significatorsB: string[];
  significatorsC: string[];
  significatorsD: string[];
  drishtiPlanets?: string[];
  connectionPlanets?: string[];
  subLordAbcdPlanets?: string;
  subLordKaryeshBhav?: string;
  subLordRahuKetuConnection?: string;
  subLordDrishti?: string;
  subLordConjunction?: string;
  dashaChain?: string;
  customMatters: Array<{ label: string; notes: string }>;
  positiveNotes: string;
  negativeNotes: string;
  dashaNotes: string;
  freeNotes: string;
  predictionOrder: number;
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

function formatBhav(b: FinalPredictionBhavInput): string {
  const parts: string[] = [`House ${b.house}${b.subLord ? ` (Sub Lord: ${b.subLord})` : ''}`];
  const sig = (label: string, arr: string[]) => (arr.length ? `${label}: ${arr.join(', ')}` : '');
  const sigLine = [sig('A', b.significatorsA), sig('B', b.significatorsB), sig('C', b.significatorsC), sig('D', b.significatorsD)].filter(Boolean).join(' | ');
  if (sigLine) parts.push(`  Significators — ${sigLine}`);
  if (b.drishtiPlanets?.length) parts.push(`  Drishti planets: ${b.drishtiPlanets.join(', ')}`);
  if (b.connectionPlanets?.length) parts.push(`  Uti / connection planets: ${b.connectionPlanets.join(', ')}`);
  if (b.subLordAbcdPlanets) parts.push(`  Sub Lord ABCD planets: ${b.subLordAbcdPlanets}`);
  if (b.subLordKaryeshBhav) parts.push(`  Sub Lord karyesh bhav ABCD: ${b.subLordKaryeshBhav}`);
  if (b.subLordRahuKetuConnection) parts.push(`  Sub Lord Rahu/Ketu connection: ${b.subLordRahuKetuConnection}`);
  if (b.subLordDrishti) parts.push(`  Sub Lord drishti: ${b.subLordDrishti}`);
  if (b.subLordConjunction) parts.push(`  Sub Lord conjunction: ${b.subLordConjunction}`);
  if (b.dashaChain) parts.push(`  Dasha chain: ${b.dashaChain}`);
  if (b.customMatters.length) parts.push(`  Matters: ${b.customMatters.map((m) => `${m.label}${m.notes ? ` (${m.notes})` : ''}`).join('; ')}`);
  if (b.positiveNotes) parts.push(`  Positive: ${b.positiveNotes}`);
  if (b.negativeNotes) parts.push(`  Negative: ${b.negativeNotes}`);
  if (b.dashaNotes) parts.push(`  Dasha cross-notes: ${b.dashaNotes}`);
  if (b.freeNotes) parts.push(`  Notes: ${b.freeNotes}`);
  return parts.join('\n');
}

export function buildFinalPredictionPrompt(params: {
  personName: string;
  dob?: string | Date;
  gender?: string;
  language: string;
  lifeStageNotes: string;
  orderedBhavs: FinalPredictionBhavInput[];
  currentMahadasha?: { planet: string; startDate: string; endDate: string };
}): string {
  const { personName, dob, gender, language, lifeStageNotes, orderedBhavs, currentMahadasha } = params;
  const age = currentAge(dob);
  const langName = KP_LANGUAGE_NAMES[language] || 'English';

  const bhavBlock = orderedBhavs.length
    ? orderedBhavs.map((b, i) => `${i + 1}. ${formatBhav(b)}`).join('\n\n')
    : '(No bhav analysis was saved by the astrologer yet.)';

  return `You are a KP (Krishnamurti Paddhati) astrology assistant writing the FINAL prediction for an admin astrologer at Swar Yoga, to share with their client ("sadhak").

CRITICAL RULE — do not skip this: the astrologer has already done the per-bhav analytical work below, IN THE ORDER GIVEN. That order is deliberate — it is the priority order for this prediction. Use ONLY this analysis as your factual basis; do not invent planetary facts beyond it.

NATIVE: ${personName}${gender ? `, ${gender}` : ''}${age !== null ? `, currently ${age} years old` : ''}.
${currentMahadasha ? `Current Mahadasha: ${currentMahadasha.planet} (${currentMahadasha.startDate} to ${currentMahadasha.endDate}).` : ''}
KNOWN CURRENT LIFE FACTS (astrologer-provided — treat as ground truth about the native's present life stage): ${lifeStageNotes || '(none provided)'}

LIFE-STAGE ETHICS RULE (apply this strictly): astrological indications describe potential and timing tendencies, not certainties that ignore the native's actual life stage. Before stating any prediction:
- If the native's age or the known life facts make an indicated event already past or already fulfilled (e.g. a dasha "supports marriage" but the life facts say the native is already married, or supports a career change but they're already retired), do NOT predict that event as upcoming. Reframe the astrological support constructively for the native's ACTUAL current situation instead (e.g. "this period deepens and stabilizes the married life already begun" rather than "marriage is coming").
- If an indicated event is genuinely still ahead given the native's age and life facts, predict it normally, with approximate timing from the dasha periods given.
- Never contradict a stated life fact. If life facts are silent on a matter, use age as a reasonable default judgment (e.g. don't predict a first marriage for someone in their 60s without it being stated as still pending).

ASTROLOGER'S BHAV ANALYSIS, IN PRIORITY ORDER (point 1 = the astrologer's chosen first prediction point, etc.):

${bhavBlock}

TASK: Write the final prediction entirely in ${langName}, addressing the reader as "sadhak" (or the ${langName} equivalent), in a warm, confident, personal tone. Structure it as numbered points following the SAME order as the bhav analysis above (point 1 first, etc.) — each point should read as a complete, standalone prediction statement grounded in that house's analysis, applying the life-stage ethics rule. Close with a brief one-paragraph overall summary. Keep each point focused (2-5 sentences), not an essay.`;
}
