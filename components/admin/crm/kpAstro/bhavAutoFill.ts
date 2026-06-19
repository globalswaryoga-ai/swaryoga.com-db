import type { BhavAnalysisRow } from './BhavEditor';
import { computeConjunctions, computeDrishtiOnHouses } from '@/lib/kpAstro/aspectAnalysis';
import { computeBhavAutoSignificators, planetKaryesLabel, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';

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

export function autoFillBhavRows(rows: BhavAnalysisRow[], houses: SignificatorHouse[], planets: SignificatorPlanet[]): BhavAnalysisRow[] {
  const drishtiHits = computeDrishtiOnHouses(planets);
  const conjunctions = computeConjunctions(planets);

  return rows.map((row) => {
    const auto = computeBhavAutoSignificators(houses, planets, row.house);
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

    return {
      ...row,
      subLord: row.subLord || auto.subLord,
      significatorsA: row.significatorsA.length ? enrichPlanetLabels(row.significatorsA, houses, planets) : auto.significatorsA,
      significatorsB: row.significatorsB.length ? enrichPlanetLabels(row.significatorsB, houses, planets) : auto.significatorsB,
      significatorsC: row.significatorsC.length ? enrichPlanetLabels(row.significatorsC, houses, planets) : auto.significatorsC,
      significatorsD: row.significatorsD.length ? enrichPlanetLabels(row.significatorsD, houses, planets) : auto.significatorsD,
      drishtiPlanets: row.drishtiPlanets.length ? enrichPlanetLabels(row.drishtiPlanets, houses, planets) : drishtiPlanets,
      connectionPlanets: row.connectionPlanets.length ? enrichPlanetLabels(row.connectionPlanets, houses, planets) : connectionPlanets,
    };
  });
}
