// KP Kundali Milan (match-making) prediction prompt — same philosophy as
// the birth/horary final-prediction prompts: only synthesizes from what the
// astrologer already saved per-bhav for EACH partner, plus their own
// free-text compatibility notes (e.g. guna milan score, manglik check) if
// the astrologer chose to record those there.

import type { FinalPredictionBhavInput } from './buildFinalPredictionPrompt';
import { KP_LANGUAGE_NAMES } from './languages';


function formatBhav(b: FinalPredictionBhavInput): string {
  const parts: string[] = [`House ${b.house}${b.subLord ? ` (Sub Lord: ${b.subLord})` : ''}`];
  const sig = (label: string, arr: string[]) => (arr.length ? `${label}: ${arr.join(', ')}` : '');
  const sigLine = [sig('A', b.significatorsA), sig('B', b.significatorsB), sig('C', b.significatorsC), sig('D', b.significatorsD)].filter(Boolean).join(' | ');
  if (sigLine) parts.push(`  Significators — ${sigLine}`);
  if (b.drishtiPlanets?.length) parts.push(`  Drishti planets: ${b.drishtiPlanets.join(', ')}`);
  if (b.connectionPlanets?.length) parts.push(`  Uti / connection planets: ${b.connectionPlanets.join(', ')}`);
  if (b.customMatters.length) parts.push(`  Matters: ${b.customMatters.map((m) => `${m.label}${m.notes ? ` (${m.notes})` : ''}`).join('; ')}`);
  if (b.positiveNotes) parts.push(`  Positive: ${b.positiveNotes}`);
  if (b.negativeNotes) parts.push(`  Negative: ${b.negativeNotes}`);
  if (b.dashaNotes) parts.push(`  Dasha cross-notes: ${b.dashaNotes}`);
  if (b.freeNotes) parts.push(`  Notes: ${b.freeNotes}`);
  return parts.join('\n');
}

function bhavBlock(rows: FinalPredictionBhavInput[]): string {
  return rows.length ? rows.map((b, i) => `${i + 1}. ${formatBhav(b)}`).join('\n\n') : '(No bhav analysis was saved by the astrologer yet.)';
}

export function buildMatchmakingPrompt(params: {
  groomName: string;
  brideName: string;
  language: string;
  compatibilityNotes: string;
  groomBhavs: FinalPredictionBhavInput[];
  brideBhavs: FinalPredictionBhavInput[];
}): string {
  const { groomName, brideName, language, compatibilityNotes, groomBhavs, brideBhavs } = params;
  const langName = KP_LANGUAGE_NAMES[language] || 'English';

  return `You are a KP (Krishnamurti Paddhati) astrology assistant writing a Kundali Milan (match-making compatibility) prediction for an admin astrologer at Swar Yoga, to share with the couple.

CRITICAL RULE: the astrologer has already analyzed each partner's relevant houses below, in their own chosen priority order — this is your ONLY factual basis for each partner. Do not invent planetary facts beyond it.

GROOM: ${groomName}
Groom's house analysis, in priority order:
${bhavBlock(groomBhavs)}

BRIDE: ${brideName}
Bride's house analysis, in priority order:
${bhavBlock(brideBhavs)}

ASTROLOGER'S COMPATIBILITY NOTES (guna milan score, manglik status, any other cross-checks already done — treat as ground truth, do not recompute or contradict): ${compatibilityNotes || '(none provided)'}

TASK: Write the match-making prediction entirely in ${langName}, in a warm, balanced, respectful tone addressing the couple. Structure it as:
1. A brief overall compatibility verdict (favorable / favorable with remedies / not recommended — based on the notes and analysis given).
2. Numbered points covering each partner's relevant house indications and how they interact for married life (use the priority order given for each partner).
3. A closing paragraph with practical guidance if any cautions were noted.
Keep each point focused (2-4 sentences) — this is a confident professional reading, not an essay.`;
}
