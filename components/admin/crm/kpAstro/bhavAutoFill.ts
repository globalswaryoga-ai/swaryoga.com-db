import type { BhavAnalysisRow } from './BhavEditor';
import { computeConjunctions, computeDrishtiOnHouses, computeDrishtiOnPlanets } from '@/lib/kpAstro/aspectAnalysis';
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

export function autoFillBhavRows(rows: BhavAnalysisRow[], houses: SignificatorHouse[], planets: AutoFillPlanet[], dashaChain = ''): BhavAnalysisRow[] {
  const drishtiHits = computeDrishtiOnHouses(planets);
  const planetDrishti = computeDrishtiOnPlanets(planets);
  const conjunctions = computeConjunctions(planets);

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
    };
  });
}
