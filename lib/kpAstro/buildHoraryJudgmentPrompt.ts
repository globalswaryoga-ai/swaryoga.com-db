// Horary (Prashna) judgment prompt — same "astrologer works the bhavs
// first, AI only synthesizes after" philosophy as the birth-chart final
// prediction, adapted to horary's binary yes/no judgment nature. The
// astrologer marks which house(s) are relevant to the question (via the
// same BhavEditor workspace) and the AI reads only that, plus the Ruling
// Planets snapshot captured at the moment the question was asked.

import type { FinalPredictionBhavInput } from './buildFinalPredictionPrompt';
import { KP_LANGUAGE_NAMES } from './languages';


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
  if (b.freeNotes) parts.push(`  Notes: ${b.freeNotes}`);
  return parts.join('\n');
}

export function buildHoraryJudgmentPrompt(params: {
  questionText: string;
  querentName?: string;
  language: string;
  rulingPlanets?: {
    dayLord?: string; lagnaSign?: string; lagnaSignLord?: string; lagnaStarLord?: string; lagnaSubLord?: string;
    moonSign?: string; moonSignLord?: string; moonStarLord?: string; moonSubLord?: string; retrogradePlanets?: string[];
  };
  orderedBhavs: FinalPredictionBhavInput[];
}): string {
  const { questionText, querentName, language, rulingPlanets: rp, orderedBhavs } = params;
  const langName = KP_LANGUAGE_NAMES[language] || 'English';

  const bhavBlock = orderedBhavs.length
    ? orderedBhavs.map((b, i) => `${i + 1}. ${formatBhav(b)}`).join('\n\n')
    : '(No bhav analysis was saved by the astrologer yet.)';

  const rpBlock = rp
    ? `Day Lord: ${rp.dayLord || '-'}; Lagna: ${rp.lagnaSign || '-'} (sign lord ${rp.lagnaSignLord || '-'}, star lord ${rp.lagnaStarLord || '-'}, sub lord ${rp.lagnaSubLord || '-'}); Moon: ${rp.moonSign || '-'} (sign lord ${rp.moonSignLord || '-'}, star lord ${rp.moonStarLord || '-'}, sub lord ${rp.moonSubLord || '-'})${rp.retrogradePlanets?.length ? `; Retrograde: ${rp.retrogradePlanets.join(', ')}` : ''}`
    : '(not captured)';

  return `You are a KP (Krishnamurti Paddhati) horary astrology assistant delivering a judgment for an admin astrologer at Swar Yoga, to share with the querent${querentName ? ` ("${querentName}")` : ''}.

QUESTION ASKED: "${questionText}"

CRITICAL RULE: the astrologer has already analyzed the relevant house(s) for this question below — this is your ONLY factual basis. Do not invent planetary facts beyond it. KP horary judgment works primarily through the SIGNIFICATORS and SUB LORDS given — if the sub lord of the relevant house signifies the matter positively (per the astrologer's notes), the answer leans YES; if it signifies negatively or denial, the answer leans NO.

RULING PLANETS AT THE MOMENT ASKED (corroborating evidence, use to support/strengthen the judgment, not override the house analysis):
${rpBlock}

ASTROLOGER'S RELEVANT HOUSE ANALYSIS:

${bhavBlock}

TASK: Write the judgment entirely in ${langName}. Open with a clear, direct YES / NO / QUALIFIED-YES (or similar direct verdict appropriate to the question type — some questions aren't yes/no, e.g. "when" or "which option" — answer in the form the question actually calls for). Then explain the reasoning in 2-4 sentences grounded in the sub-lord and significator analysis above, mentioning timing (from the relevant dasha/transit notes if given) where relevant. Keep it concise and direct — horary answers should not be long essays.`;
}
