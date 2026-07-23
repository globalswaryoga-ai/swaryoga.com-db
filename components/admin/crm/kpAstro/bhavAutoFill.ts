import type { AspectBlock, BhavAnalysisRow, PredictionTemplate } from './BhavEditor';
import { computeConjunctions, computeDrishtiOnHouses, computeDrishtiOnPlanets } from '@/lib/kpAstro/aspectAnalysis';
import { computePlanetaryAspects, type PlanetAspectRow } from '@/lib/kpAstro/planetaryAspects';
import {
  computeBhavAutoSignificators,
  computeFourStepSignificators,
  housesOccupiedBy,
  housesOwnedBy,
  planetKaryesLabel,
  starLordOf,
  type SignificatorHouse,
  type SignificatorPlanet,
} from '@/lib/kpAstro/significators';

type AutoFillPlanet = SignificatorPlanet & { retrograde?: boolean };

function basePlanetName(value: string): string {
  return value.split('[')[0].split('(')[0].trim();
}

function enrichPlanetLabels(values: string[], houses: SignificatorHouse[], planets: SignificatorPlanet[]): string[] {
  return values.map((value) => {
    if (value.includes(' with ')) return value;
    const fromHouseIndex = value.indexOf(' from House ');
    if (fromHouseIndex !== -1) {
      const prefix = value.slice(0, fromHouseIndex);
      const suffix = value.slice(fromHouseIndex);
      const planetName = basePlanetName(prefix);
      return planets.some((p) => p.planet === planetName) ? `${planetKaryesLabel(houses, planets, planetName)}${suffix}` : value;
    }
    const planetName = basePlanetName(value);
    return planets.some((p) => p.planet === planetName) ? planetKaryesLabel(houses, planets, planetName) : value;
  });
}

function formatHouseNumbers(values: number[]): string {
  return values.length ? values.join(', ') : '-';
}

function retrogradeStatus(planet: AutoFillPlanet | undefined): string {
  if (!planet) return '';
  return planet.retrograde ? 'Retrograde' : 'Direct';
}

function formatPlanetSignification(houses: SignificatorHouse[], planets: AutoFillPlanet[], planetName: string | undefined): string {
  if (!planetName) return '';
  const occupied = housesOccupiedBy(planets, planetName);
  const owned = housesOwnedBy(houses, planetName);
  const combined = [...new Set([...occupied, ...owned])].sort((a, b) => a - b);
  return `${planetName} = ${formatHouseNumbers(combined)} (deposition: ${formatHouseNumbers(occupied)}; ownership: ${formatHouseNumbers(owned)})`;
}

function formatSubLordAbcdPlanets(subLord: string, planets: SignificatorPlanet[]): string {
  if (!subLord) return '';
  const planet = planets.find((p) => p.planet === subLord);
  const starLord = planet ? starLordOf(planet) : undefined;
  return [
    `A: ${starLord || '-'}`,
    `B: ${subLord}`,
    `C: ${subLord}`,
    `D: ${starLord || '-'}`,
  ].join(' | ');
}

function formatSubLordKaryeshBhav(houses: SignificatorHouse[], planets: SignificatorPlanet[], subLord: string): string {
  if (!subLord) return '';
  const sig = computeFourStepSignificators(houses, planets).find((s) => s.planet === subLord);
  if (!sig) return `${subLord}: not found in chart planets`;
  return [
    `A: ${formatHouseNumbers(sig.A)}`,
    `B: ${formatHouseNumbers(sig.B)}`,
    `C: ${formatHouseNumbers(sig.C)}`,
    `D: ${formatHouseNumbers(sig.D)}`,
  ].join(' | ');
}

function formatHouseAbcdPlanets(row: BhavAnalysisRow): string {
  return [
    `A: ${row.significatorsA.join(', ') || '-'}`,
    `B: ${row.significatorsB.join(', ') || '-'}`,
    `C: ${row.significatorsC.join(', ') || '-'}`,
    `D: ${row.significatorsD.join(', ') || '-'}`,
  ].join(' | ');
}

function subLordConnectionsWithNodes(subLord: string, conjunctions: ReturnType<typeof computeConjunctions>, drishti: ReturnType<typeof computeDrishtiOnPlanets>): string {
  if (!subLord) return '';
  const nodeSet = new Set(['Rahu', 'Ketu']);
  const hits: string[] = [];

  for (const c of conjunctions) {
    const other = c.planetA === subLord ? c.planetB : c.planetB === subLord ? c.planetA : '';
    if (nodeSet.has(other)) hits.push(`Conj ${other} (${c.separation.toFixed(1)} deg)`);
  }

  for (const d of drishti) {
    if (d.from === subLord && nodeSet.has(d.to)) hits.push(`Drishti to ${d.to} (house ${d.toHouse})`);
    if (d.to === subLord && nodeSet.has(d.from)) hits.push(`Drishti from ${d.from} (house ${d.toHouse})`);
  }

  return hits.join('; ') || 'No Rahu/Ketu connection found';
}

function formatSubLordDrishti(subLord: string, drishti: ReturnType<typeof computeDrishtiOnPlanets>): string {
  if (!subLord) return '';
  const hits = drishti
    .filter((d) => d.from === subLord || d.to === subLord)
    .map((d) => d.from === subLord ? `${d.from} -> ${d.to} (house ${d.toHouse})` : `${d.from} -> ${d.to} (house ${d.toHouse})`);
  return hits.join('; ') || 'No drishti found';
}

function formatSubLordConjunction(subLord: string, conjunctions: ReturnType<typeof computeConjunctions>): string {
  if (!subLord) return '';
  const hits = conjunctions
    .filter((c) => c.planetA === subLord || c.planetB === subLord)
    .map((c) => {
      const other = c.planetA === subLord ? c.planetB : c.planetA;
      return `${other} (${c.separation.toFixed(1)} deg, orb ${c.orbUsed} deg)`;
    });
  return hits.join('; ') || 'No conjunction found';
}

function aspectBlockHasValue(block: AspectBlock): boolean {
  return Boolean(block.present || block.planet || block.planetRetrograde || block.starLordRetrograde || block.signification || block.favorable);
}

// One "Is X Conjunct/Opposed with any planet?" block, auto-derived for
// `forPlanet` (the sub lord or star lord) from the pre-computed planetary
// aspects grid (see lib/kpAstro/planetaryAspects.ts — Conjunction = 0deg,
// Opposition = 180deg, both +/-8deg orb, matching standard KP software).
function computeAspectBlock(
  forPlanet: string | undefined,
  aspectType: 'Conjunction' | 'Opposition',
  aspectRows: PlanetAspectRow[],
  houses: SignificatorHouse[],
  planets: AutoFillPlanet[]
): AspectBlock {
  const empty: AspectBlock = { present: '', planet: '', planetRetrograde: '', starLordRetrograde: '', signification: '', favorable: '' };
  if (!forPlanet) return empty;
  const row = aspectRows.find((r) => r.planet === forPlanet);
  const hits = row?.aspects[aspectType] || [];
  if (!hits.length) {
    return { ...empty, present: 'No' };
  }
  const otherName = hits[0];
  const otherPlanet = planets.find((p) => p.planet === otherName);
  const otherStarLord = otherPlanet ? starLordOf(otherPlanet) : undefined;
  const otherStarLordPlanet = planets.find((p) => p.planet === otherStarLord);
  const signification = [
    formatPlanetSignification(houses, planets, otherName),
    otherStarLord ? `Star lord ${formatPlanetSignification(houses, planets, otherStarLord)}` : '',
  ].filter(Boolean).join(' · ');
  return {
    present: 'Yes',
    planet: otherName,
    planetRetrograde: retrogradeStatus(otherPlanet),
    starLordRetrograde: retrogradeStatus(otherStarLordPlanet),
    signification,
    favorable: '',
  };
}

// Drafts a starting "Rule" sentence from the sub-lord/star-lord retrograde
// findings, applying the exact interpretive rule already curated in this
// file's own "Prediction Template" toolkit reference card (retrograde CSL =
// delay, retrograde star owner = denial, use star-owner's houses for
// Result/Conclusion) — a real KP rule-of-thumb, not fabricated text. Always
// editable afterwards; the astrologer can refine or replace it.
function composeBaseRule(subLordRetrograde: string, starLordRetrograde: string, starLordHouses: string): string {
  const lines: string[] = [];
  if (subLordRetrograde === 'Retrograde') lines.push('Sub Lord is retrograde — expect delay.');
  if (starLordRetrograde === 'Retrograde') lines.push('Star Lord is retrograde — treat as denial/weak delivery unless notes override.');
  if (!lines.length) lines.push('Sub Lord and Star Lord are both direct — no delay/denial expected from retrogression.');
  lines.push(`Use Star Lord's house signification for Result and Conclusion: ${starLordHouses}.`);
  return lines.join(' ');
}

// Auto-fills the detailed prediction-template worksheet (see BhavEditor.tsx's
// PredictionTemplate type): sub-lord chain (sub lord -> its star -> that
// star's lord) plus the four conjunction/opposition blocks. Never overwrites
// a field/block the astrologer has already touched.
function autoFillPredictionTemplate(
  row: BhavAnalysisRow,
  houses: SignificatorHouse[],
  planets: AutoFillPlanet[],
  aspectRows: PlanetAspectRow[]
): PredictionTemplate {
  const pt = row.predictionTemplate;
  const primaryHouse = pt.primaryHouse || row.house;
  const primaryHouseData = houses.find((h) => h.house === primaryHouse);
  const templateSubLord = row.subLord || primaryHouseData?.subLord || '';
  const templateSubLordPlanet = planets.find((p) => p.planet === templateSubLord);
  const templateStarLord = pt.starLord || (templateSubLordPlanet ? starLordOf(templateSubLordPlanet) : undefined) || '';
  const templateStarLordPlanet = planets.find((p) => p.planet === templateStarLord);
  const starLordOccupied = housesOccupiedBy(planets, templateStarLord);
  const starLordOwned = housesOwnedBy(houses, templateStarLord);
  const connecting = [...new Set([...starLordOccupied, ...starLordOwned])].filter((h) => [6, 8, 12].includes(h)).sort((a, b) => a - b);

  const resolvedSubLordRetrograde = pt.subLordRetrograde || retrogradeStatus(templateSubLordPlanet);
  const resolvedStarLordRetrograde = pt.starLordRetrograde || retrogradeStatus(templateStarLordPlanet);
  const resolvedStarLordHouses = pt.starLordHouses || `Deposited: ${formatHouseNumbers(starLordOccupied)} · Owns: ${formatHouseNumbers(starLordOwned)}`;

  return {
    primaryHouse,
    subLordRetrograde: resolvedSubLordRetrograde,
    subLordStar: pt.subLordStar || templateSubLordPlanet?.star || '',
    starLord: templateStarLord,
    starLordRetrograde: resolvedStarLordRetrograde,
    starLordHouses: resolvedStarLordHouses,
    starLordConnecting: pt.starLordConnecting || (connecting.length ? `Yes (House ${connecting.join(', ')})` : 'No'),
    subLordConjunct: aspectBlockHasValue(pt.subLordConjunct) ? pt.subLordConjunct : computeAspectBlock(templateSubLord, 'Conjunction', aspectRows, houses, planets),
    starLordConjunct: aspectBlockHasValue(pt.starLordConjunct) ? pt.starLordConjunct : computeAspectBlock(templateStarLord, 'Conjunction', aspectRows, houses, planets),
    subLordOpposed: aspectBlockHasValue(pt.subLordOpposed) ? pt.subLordOpposed : computeAspectBlock(templateSubLord, 'Opposition', aspectRows, houses, planets),
    starLordOpposed: aspectBlockHasValue(pt.starLordOpposed) ? pt.starLordOpposed : computeAspectBlock(templateStarLord, 'Opposition', aspectRows, houses, planets),
    summary: pt.summary,
    conclusion: pt.conclusion,
    rule: pt.rule || composeBaseRule(resolvedSubLordRetrograde, resolvedStarLordRetrograde, resolvedStarLordHouses),
  };
}

// Recomputes the ENTIRE sub-lord chain + all four aspect blocks from scratch
// for a newly-chosen Primary House, ignoring whatever was there before (unlike
// autoFillPredictionTemplate's never-overwrite convention). Used when the
// astrologer changes the Primary House dropdown on a matter — at that point
// the old computed values describe a different house and must not linger.
export function computeFreshTemplate(
  primaryHouse: number,
  houses: SignificatorHouse[],
  planets: AutoFillPlanet[]
): { subLord: string; predictionTemplate: PredictionTemplate } {
  const aspectRows = computePlanetaryAspects(planets);
  const primaryHouseData = houses.find((h) => h.house === primaryHouse);
  const subLord = primaryHouseData?.subLord || '';
  const subLordPlanet = planets.find((p) => p.planet === subLord);
  const starLord = (subLordPlanet ? starLordOf(subLordPlanet) : undefined) || '';
  const starLordPlanet = planets.find((p) => p.planet === starLord);
  const starLordOccupied = housesOccupiedBy(planets, starLord);
  const starLordOwned = housesOwnedBy(houses, starLord);
  const connecting = [...new Set([...starLordOccupied, ...starLordOwned])].filter((h) => [6, 8, 12].includes(h)).sort((a, b) => a - b);
  const subLordRetrograde = retrogradeStatus(subLordPlanet);
  const starLordRetrograde = retrogradeStatus(starLordPlanet);
  const starLordHouses = `Deposited: ${formatHouseNumbers(starLordOccupied)} · Owns: ${formatHouseNumbers(starLordOwned)}`;

  return {
    subLord,
    predictionTemplate: {
      primaryHouse,
      subLordRetrograde,
      subLordStar: subLordPlanet?.star || '',
      starLord,
      starLordRetrograde,
      starLordHouses,
      starLordConnecting: connecting.length ? `Yes (House ${connecting.join(', ')})` : 'No',
      subLordConjunct: computeAspectBlock(subLord, 'Conjunction', aspectRows, houses, planets),
      starLordConjunct: computeAspectBlock(starLord, 'Conjunction', aspectRows, houses, planets),
      subLordOpposed: computeAspectBlock(subLord, 'Opposition', aspectRows, houses, planets),
      starLordOpposed: computeAspectBlock(starLord, 'Opposition', aspectRows, houses, planets),
      summary: '',
      conclusion: '',
      rule: composeBaseRule(subLordRetrograde, starLordRetrograde, starLordHouses),
    },
  };
}

export function autoFillBhavRows(rows: BhavAnalysisRow[], houses: SignificatorHouse[], planets: AutoFillPlanet[], dashaChain = ''): BhavAnalysisRow[] {
  const drishtiHits = computeDrishtiOnHouses(planets);
  const planetDrishti = computeDrishtiOnPlanets(planets);
  const conjunctions = computeConjunctions(planets);
  const aspectRows = computePlanetaryAspects(planets);

  return rows.map((row) => {
    const auto = computeBhavAutoSignificators(houses, planets, row.house);
    const subLord = row.subLord || auto.subLord;
    const subLordPlanet = planets.find((p) => p.planet === subLord);
    const cslStarOwner = subLordPlanet ? starLordOf(subLordPlanet) : undefined;
    const cslStarOwnerPlanet = planets.find((p) => p.planet === cslStarOwner);
    const drishtiPlanets = drishtiHits
      .filter((hit) => hit.toHouse === row.house)
      .map((hit) => `${planetKaryesLabel(houses, planets, hit.planet)} from House ${hit.fromHouse}`);
    const connectionPlanets = conjunctions
      .filter((hit) => planets.some((p) => p.planet === hit.planetA && p.house === row.house) || planets.some((p) => p.planet === hit.planetB && p.house === row.house))
      .map((hit) => {
        const a = planetKaryesLabel(houses, planets, hit.planetA);
        const b = planetKaryesLabel(houses, planets, hit.planetB);
        return `${a} with ${b}`;
      });
    const enrichedRow = {
      ...row,
      subLord,
      significatorsA: row.significatorsA.length ? enrichPlanetLabels(row.significatorsA, houses, planets) : auto.significatorsA,
      significatorsB: row.significatorsB.length ? enrichPlanetLabels(row.significatorsB, houses, planets) : auto.significatorsB,
      significatorsC: row.significatorsC.length ? enrichPlanetLabels(row.significatorsC, houses, planets) : auto.significatorsC,
      significatorsD: row.significatorsD.length ? enrichPlanetLabels(row.significatorsD, houses, planets) : auto.significatorsD,
      drishtiPlanets: row.drishtiPlanets.length ? enrichPlanetLabels(row.drishtiPlanets, houses, planets) : drishtiPlanets,
      connectionPlanets: row.connectionPlanets.length ? enrichPlanetLabels(row.connectionPlanets, houses, planets) : connectionPlanets,
    };

    return {
      ...enrichedRow,
      subLordAbcdPlanets: row.subLordAbcdPlanets || formatSubLordAbcdPlanets(subLord, planets) || formatHouseAbcdPlanets(enrichedRow),
      subLordKaryeshBhav: row.subLordKaryeshBhav || formatSubLordKaryeshBhav(houses, planets, subLord),
      subLordRahuKetuConnection: row.subLordRahuKetuConnection || subLordConnectionsWithNodes(subLord, conjunctions, planetDrishti),
      subLordDrishti: row.subLordDrishti || formatSubLordDrishti(subLord, planetDrishti),
      subLordConjunction: row.subLordConjunction || formatSubLordConjunction(subLord, conjunctions),
      dashaChain: row.dashaChain || dashaChain,
      toolkitPrimaryHouse: row.toolkitPrimaryHouse || String(row.house),
      cslRetrogradeStatus: row.cslRetrogradeStatus || retrogradeStatus(subLordPlanet),
      cslStarLord: row.cslStarLord || subLordPlanet?.star || '',
      cslStarLordOwner: row.cslStarLordOwner || cslStarOwner || '',
      cslStarLordRetrogradeStatus: row.cslStarLordRetrogradeStatus || retrogradeStatus(cslStarOwnerPlanet),
      cslStarLordSignification: row.cslStarLordSignification || formatPlanetSignification(houses, planets, cslStarOwner),
      karyeshRuleResult: row.karyeshRuleResult || (cslStarOwner ? `${row.house} = ${formatPlanetSignification(houses, planets, cslStarOwner)}` : ''),
      predictionTemplate: autoFillPredictionTemplate(enrichedRow, houses, planets, aspectRows),
    };
  });
}
