// Builds the system prompt for the "Final Prediction" step — the step that
// only fires AFTER the astrologer has completed the per-bhav workspace.
// Explicit user requirement: the AI must not blindly predict a life event
// just because a dasha astrologically supports it — it must reconcile that
// against the native's actual current age and any known current life facts
// (e.g. don't predict marriage from a supportive dasha if the native is
// already married; reframe it as e.g. "deepening of married life" instead).

import { KP_LANGUAGE_NAMES } from './languages';
import { horoscopeSections } from './horoscopeSections';
import { findSubTableRow, diseasesByNo, mindsetByNo, professionsByNo, gemstoneByPlanet } from './index';

export interface FinalPredictionHouseInput {
  house: number;
  sign?: string;
  star?: string;
  subLord?: string;
}

// Rulebook text sources keyed by the house whose cusp sub-lord position the
// content was authored for (same 249-division lookup as the report flow).
const HOUSE_RULEBOOK: Record<number, { label: string; data: Record<string, string> }> = {
  3: { label: 'Mindset rulebook (3rd cusp)', data: mindsetByNo },
  6: { label: 'Diseases rulebook (6th cusp)', data: diseasesByNo },
  10: { label: 'Profession rulebook (10th cusp)', data: professionsByNo },
};

function buildRulebookBlock(houses: FinalPredictionHouseInput[] | undefined): string {
  if (!houses?.length) return '';
  const lines: string[] = [];
  for (const h of houses) {
    const source = HOUSE_RULEBOOK[h.house];
    if (!source) continue;
    const matched = findSubTableRow(h.sign, h.star, h.subLord);
    if (!matched) continue;
    const text = source.data[String(matched.no)];
    if (text) lines.push(`- ${source.label}, Sub Lord match #${matched.no}: ${text}`);
  }
  if (!lines.length) return '';
  return `\nCURATED KP RULEBOOK CONTENT for this chart (authoritative — weave these findings into the matching life sections):\n${lines.join('\n')}\n`;
}

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
  toolkitMatter?: string;
  toolkitPrimaryHouse?: string;
  toolkitSupportingHouses?: string;
  toolkitOpposingHouses?: string;
  cslRetrogradeStatus?: string;
  cslStarLord?: string;
  cslStarLordOwner?: string;
  cslStarLordRetrogradeStatus?: string;
  cslStarLordSignification?: string;
  karyeshRuleResult?: string;
  karyeshRuleConclusion?: string;
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
  const toolkitLines = [
    b.toolkitMatter ? `Matter/event: ${b.toolkitMatter}` : '',
    b.toolkitPrimaryHouse ? `Primary house: ${b.toolkitPrimaryHouse}` : '',
    b.toolkitSupportingHouses ? `Supporting houses: ${b.toolkitSupportingHouses}` : '',
    b.toolkitOpposingHouses ? `Opposing/denial houses: ${b.toolkitOpposingHouses}` : '',
    b.cslRetrogradeStatus ? `CSL retro/direct: ${b.cslRetrogradeStatus}` : '',
    b.cslStarLord ? `Star of CSL: ${b.cslStarLord}` : '',
    b.cslStarLordOwner ? `Owner of Star of CSL: ${b.cslStarLordOwner}` : '',
    b.cslStarLordRetrogradeStatus ? `Star owner retro/direct: ${b.cslStarLordRetrogradeStatus}` : '',
    b.cslStarLordSignification ? `Signification by Owner of Star of CSL: ${b.cslStarLordSignification}` : '',
    b.karyeshRuleResult ? `Rule result: ${b.karyeshRuleResult}` : '',
    b.karyeshRuleConclusion ? `Rule conclusion: ${b.karyeshRuleConclusion}` : '',
  ].filter(Boolean);
  if (toolkitLines.length) parts.push(`  Toolkit Karyesh rule template:\n    ${toolkitLines.join('\n    ')}`);
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
  houses?: FinalPredictionHouseInput[];
}): string {
  const { personName, dob, gender, language, lifeStageNotes, orderedBhavs, currentMahadasha, houses } = params;
  const age = currentAge(dob);
  const langName = KP_LANGUAGE_NAMES[language] || 'English';

  const bhavBlock = orderedBhavs.length
    ? orderedBhavs.map((b, i) => `${i + 1}. ${formatBhav(b)}`).join('\n\n')
    : '(No bhav analysis was saved by the astrologer yet.)';

  // Fixed life-area structure for the output — each section names its KP
  // houses so the AI knows exactly which saved bhav rows to draw from.
  const sectionBlock = horoscopeSections
    .map((s, i) => {
      const housesLabel = s.houses.length ? ` [houses ${s.houses.join(', ')}]` : '';
      return `${i + 1}. ${s.title}${housesLabel}${s.notes ? ` — ${s.notes}` : ''}`;
    })
    .join('\n');

  const rulebookBlock = buildRulebookBlock(houses);

  const gemstoneBlock = `\nGEMSTONE REFERENCE (planet → stone; recommend only for a clearly weak/afflicted planet):\n${Object.entries(gemstoneByPlanet)
    .map(([planet, stone]) => `  ${planet}: ${stone}`)
    .join('\n')}\n`;

  return `You are a KP (Krishnamurti Paddhati) astrology assistant writing the FINAL prediction for an admin astrologer at Swar Yoga, to share with their client ("sadhak").

CRITICAL RULE — do not skip this: the astrologer has already done the per-bhav analytical work below. Use ONLY this analysis (plus the curated rulebook content, if provided) as your factual basis; do not invent planetary facts beyond it.

KARYESH TOOLKIT RULE — when a bhav includes the "Toolkit Karyesh rule template", treat it as the controlling rule logic for every life section that draws on that house. Use the Matter, Primary House, CSL, CSL R/D, Star of CSL, Owner of Star of CSL, star-owner signification, Result, and Conclusion exactly as the astrologer saved them. If CSL is marked Retrograde, describe delay/slow delivery. If the star-owner is marked Retrograde, treat the result as denial, weakness, or delayed fulfillment unless the astrologer's conclusion clearly says otherwise. Compare the star-owner significations with supporting houses and opposing/denial houses; do not override the astrologer's conclusion.

NATIVE: ${personName}${gender ? `, ${gender}` : ''}${age !== null ? `, currently ${age} years old` : ''}.
${currentMahadasha ? `Current Mahadasha: ${currentMahadasha.planet} (${currentMahadasha.startDate} to ${currentMahadasha.endDate}).` : ''}
KNOWN CURRENT LIFE FACTS (astrologer-provided — treat as ground truth about the native's present life stage): ${lifeStageNotes || '(none provided)'}

LIFE-STAGE ETHICS RULE (apply this strictly): astrological indications describe potential and timing tendencies, not certainties that ignore the native's actual life stage. Before stating any prediction:
- If the native's age or the known life facts make an indicated event already past or already fulfilled (e.g. a dasha "supports marriage" but the life facts say the native is already married, or supports a career change but they're already retired), do NOT predict that event as upcoming. Reframe the astrological support constructively for the native's ACTUAL current situation instead (e.g. "this period deepens and stabilizes the married life already begun" rather than "marriage is coming").
- If an indicated event is genuinely still ahead given the native's age and life facts, predict it normally, with approximate timing from the dasha periods given.
- Never contradict a stated life fact. If life facts are silent on a matter, use age as a reasonable default judgment (e.g. don't predict a first marriage for someone in their 60s without it being stated as still pending).
- Age-gate the education sections: for a native past student age, describe how those periods PLAYED OUT (past tense) briefly, or their relevance to children/further learning — never predict school education as upcoming for an adult.

ASTROLOGER'S BHAV ANALYSIS (house-by-house factual basis):

${bhavBlock}
${rulebookBlock}${gemstoneBlock}
TASK: Write the final prediction entirely in ${langName}, addressing the reader as "sadhak" (or the ${langName} equivalent), in a warm, confident, personal tone.

Structure the output EXACTLY as the following numbered life sections, in this order, translating each section title into ${langName} (keep the numbering). For each section, ground your statements in the saved analysis of the houses listed for that section — sub lords, A/B/C/D significators, karyesh toolkit conclusions, and dasha context. Where the analysis for a section's houses is thin, give a brief, honest indication from whatever IS saved rather than inventing detail.

LIFE SECTIONS (fixed structure — every section must appear):
${sectionBlock}

Keep each section focused (2-6 sentences; the Do's & Don'ts section uses two short bullet lists instead). After the last section, close with a brief one-paragraph overall summary. Do not add sections beyond these.`;
}
