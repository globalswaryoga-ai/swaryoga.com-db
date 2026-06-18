import {
  basicRules,
  diseasesByNo,
  mindsetByNo,
  professionsByNo,
  doshaRemedies,
  gemstoneByPlanet,
  findSubTableRow,
} from './index';
import { horoscopeSections } from './horoscopeSections';

interface ChartHouse {
  house: number;
  sign?: string;
  signLord?: string;
  star?: string;
  starLord?: string;
  subLord?: string;
  degree?: string;
}

interface ChartPlanet {
  planet: string;
  sign?: string;
  star?: string;
  subLord?: string;
  house?: number;
  degree?: string;
  retrograde?: boolean;
  combust?: boolean;
}

interface ChartMahadasha {
  planet: string;
  startDate: string | Date;
  endDate: string | Date;
}

interface ChartDoshas {
  kalsarp?: boolean;
  pitru?: boolean;
  stri?: boolean;
  otherNotes?: string;
}

export interface HoroscopeChartLike {
  personName: string;
  gender?: string;
  dob?: string | Date;
  birthTime?: string;
  birthPlace?: string;
  ascendant?: { sign?: string; degree?: string };
  houses?: ChartHouse[];
  planets?: ChartPlanet[];
  mahadashas?: ChartMahadasha[];
  doshas?: ChartDoshas;
}

// House numbers whose Sub Lord text we already have curated rulebook content
// for (see lib/kpAstro/{mindset,diseases,professions}.json — indexed by the
// same 249-division Sub Lord position used in the horary lookup tool).
const HOUSE_TEXT_SOURCES: Record<number, { label: string; data: Record<string, string> }> = {
  3: { label: 'Mindset (3rd house)', data: mindsetByNo },
  6: { label: 'Diseases (6th house)', data: diseasesByNo },
  10: { label: 'Profession (10th house)', data: professionsByNo },
};

function currentAndNextMahadasha(mahadashas: ChartMahadasha[] | undefined) {
  if (!mahadashas || mahadashas.length === 0) return { current: undefined, next: undefined };
  const sorted = [...mahadashas].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const now = Date.now();
  const currentIdx = sorted.findIndex(
    (m) => new Date(m.startDate).getTime() <= now && now <= new Date(m.endDate).getTime()
  );
  if (currentIdx === -1) return { current: undefined, next: undefined };
  return { current: sorted[currentIdx], next: sorted[currentIdx + 1] };
}

function fmtDate(d: string | Date | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toISOString().slice(0, 10);
}

// Builds the structured text context handed to the AI for both report
// generation and chat — keeping both call sites grounded in the same facts.
export function buildChartContext(chart: HoroscopeChartLike): string {
  const parts: string[] = [];

  parts.push(`Person: ${chart.personName}${chart.gender ? ` (${chart.gender})` : ''}`);
  if (chart.dob) parts.push(`Date of birth: ${fmtDate(chart.dob)}`);
  if (chart.birthTime) parts.push(`Time of birth: ${chart.birthTime}`);
  if (chart.birthPlace) parts.push(`Place of birth: ${chart.birthPlace}`);
  if (chart.ascendant?.sign) parts.push(`Ascendant (Lagna): ${chart.ascendant.sign} ${chart.ascendant.degree || ''}`.trim());

  if (chart.houses?.length) {
    parts.push('\nHouse cusps (Sign / Star / Sub Lord):');
    for (const h of [...chart.houses].sort((a, b) => a.house - b.house)) {
      parts.push(
        `  House ${h.house}: ${h.sign || '—'} (lord ${h.signLord || '—'}), Star ${h.star || '—'} (lord ${h.starLord || '—'}), Sub Lord ${h.subLord || '—'}${h.degree ? `, degree ${h.degree}` : ''}`
      );
      const matched = findSubTableRow(h.sign, h.star, h.subLord);
      const textSource = HOUSE_TEXT_SOURCES[h.house];
      if (matched && textSource) {
        const text = textSource.data[String(matched.no)];
        if (text) parts.push(`    Rulebook (${textSource.label}, Sub Lord match #${matched.no}): ${text}`);
      }
    }
  }

  if (chart.planets?.length) {
    parts.push('\nPlanet positions:');
    for (const p of chart.planets) {
      parts.push(
        `  ${p.planet}: ${p.sign || '—'}, Star ${p.star || '—'}, Sub Lord ${p.subLord || '—'}, placed in house ${p.house ?? '—'}${p.degree ? `, degree ${p.degree}` : ''}${p.retrograde ? ' [retrograde]' : ''}${p.combust ? ' [combust]' : ''}`
      );
    }
  }

  const { current, next } = currentAndNextMahadasha(chart.mahadashas);
  parts.push('\nMahadasha (as of today):');
  parts.push(
    current
      ? `  Current: ${current.planet} Mahadasha (${fmtDate(current.startDate)} to ${fmtDate(current.endDate)})`
      : '  Current: not determinable from the entered dasha periods.'
  );
  parts.push(
    next
      ? `  Next: ${next.planet} Mahadasha (starts ${fmtDate(next.startDate)})`
      : '  Next: not entered.'
  );

  const doshaLines: string[] = [];
  if (chart.doshas?.kalsarp) doshaLines.push(`Kalsarp Dosha is present. Remedy reference: ${doshaRemedies.kalsarp}`);
  if (chart.doshas?.pitru) doshaLines.push(`Pitru Dosha is present. Remedy reference: ${doshaRemedies.pitru}`);
  if (chart.doshas?.stri) doshaLines.push(`Stri Dosha is present. Remedy reference: ${doshaRemedies.stri}`);
  if (chart.doshas?.otherNotes?.trim()) doshaLines.push(`Other dosha notes: ${chart.doshas.otherNotes.trim()}`);
  parts.push('\nDoshas:');
  parts.push(doshaLines.length ? doshaLines.map((l) => `  ${l}`).join('\n') : '  None flagged.');

  parts.push('\nGemstone reference table (planet → stone, use only if a planet is clearly weak/afflicted):');
  parts.push(
    Object.entries(gemstoneByPlanet)
      .map(([planet, stone]) => `  ${planet}: ${stone}`)
      .join('\n')
  );

  parts.push('\nMatter → House rule-book reference (for cross-checking sections below):');
  for (const section of horoscopeSections) {
    if (!section.houses.length) continue;
    const matchingRules = basicRules
      .filter((r) => typeof r.primaryHouse === 'number' && section.houses.includes(r.primaryHouse as number))
      .slice(0, 5);
    if (matchingRules.length) {
      parts.push(`  For "${section.title}" (houses ${section.houses.join(', ')}):`);
      matchingRules.forEach((r) => parts.push(`    - ${r.matter} → primary house ${r.primaryHouse}, supporting ${r.supportingHouses}`));
    }
  }

  return parts.join('\n');
}

export function buildSectionPromptList(): string {
  return horoscopeSections
    .map((s, i) => `${i + 1}. ${s.title}${s.notes ? ` — ${s.notes}` : ''}`)
    .join('\n');
}
