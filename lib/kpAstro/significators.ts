// Computes the standard KP "four-step" significators (A/B/C/D) for each
// planet, plus the cuspal Sub Lord's own significations for a house — purely
// from data already stored on the chart (houses[].signLord, planets[].house),
// no schema change or new lookup tables needed beyond the existing subTable.

import { findSubTableRow } from './index';

export interface SignificatorHouse {
  house: number;
  sign?: string;
  signLord?: string;
  star?: string;
  starLord?: string;
  subLord?: string;
  degree?: string;
}

export interface SignificatorPlanet {
  planet: string;
  sign?: string;
  star?: string;
  subLord?: string;
  house?: number;
  degree?: string;
}

// Arabic Part of Fortune -- a computed chart point, not a real graha, so it's
// shaped like a planet for display purposes but kept as its own type rather
// than folded into SignificatorPlanet (it has no Vimshottari dasha role and
// owns no houses).
export interface FortunaPoint {
  sign?: string;
  signLord?: string;
  star?: string;
  starLord?: string;
  subLord?: string;
  house?: number;
  degree?: string;
}

export function housesOccupiedBy(planets: SignificatorPlanet[], planetName: string | undefined): number[] {
  if (!planetName) return [];
  const planet = planets.find((p) => p.planet === planetName);
  return planet?.house ? [planet.house] : [];
}

export function housesOwnedBy(houses: SignificatorHouse[], planetName: string | undefined): number[] {
  if (!planetName) return [];
  return houses.filter((h) => h.signLord === planetName).map((h) => h.house);
}

// Returns undefined when the planet's stored sign/star/subLord doesn't exactly
// match a row in the 249-division reference table (e.g. a hand-typed sub-lord
// boundary that's slightly off) — callers must surface that as "unresolved",
// not as a silent empty result.
export function starLordOf(planet: SignificatorPlanet): string | undefined {
  return findSubTableRow(planet.sign, planet.star, planet.subLord)?.starLord;
}

export interface FourStepSignificators {
  planet: string;
  A: number[]; // houses owned by this planet's star lord
  B: number[]; // houses occupied by this planet
  C: number[]; // houses owned by this planet
  D: number[]; // houses occupied by this planet's star lord
  starLordResolved: boolean;
}

export function computeFourStepSignificators(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[]
): FourStepSignificators[] {
  return planets.map((planet) => {
    const sl = starLordOf(planet);
    const starLordResolved = sl !== undefined;
    return {
      planet: planet.planet,
      B: housesOccupiedBy(planets, planet.planet),
      C: housesOwnedBy(houses, planet.planet),
      A: starLordResolved ? housesOwnedBy(houses, sl) : [],
      D: starLordResolved ? housesOccupiedBy(planets, sl) : [],
      starLordResolved,
    };
  });
}

function formatHouseList(values: number[]): string {
  return values.length ? values.join(',') : '-';
}

export function planetKaryesLabel(houses: SignificatorHouse[], planets: SignificatorPlanet[], planetName: string): string {
  const sig = computeFourStepSignificators(houses, planets).find((s) => s.planet === planetName);
  if (!sig) return planetName;
  return `${planetName} [A:${formatHouseList(sig.A)} B:${formatHouseList(sig.B)} C:${formatHouseList(sig.C)} D:${formatHouseList(sig.D)}]`;
}

export interface BhavAutoSignificators {
  house: number;
  subLord: string;
  significatorsA: string[]; // star lord(s) of the occupant(s)
  significatorsB: string[]; // occupant(s) of this house
  significatorsC: string[]; // owner of this house (its sign lord)
  significatorsD: string[]; // star lord of the owner
}

// Auto-derives the BhavEditor's per-house Sub Lord + A/B/C/D significator
// chips from the chart's already-computed houses/planets — so the astrologer
// starts from a filled-in best guess and only has to correct it, instead of
// typing every planet name in from scratch.
export function computeBhavAutoSignificators(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[],
  houseNumber: number
): BhavAutoSignificators {
  const house = houses.find((h) => h.house === houseNumber);
  const occupants = planets.filter((p) => p.house === houseNumber).map((p) => p.planet);
  const owner = house?.signLord;

  const starLordsOf = (names: string[]): string[] => {
    const result = new Set<string>();
    for (const name of names) {
      const planet = planets.find((p) => p.planet === name);
      const sl = planet ? starLordOf(planet) : undefined;
      if (sl) result.add(planetKaryesLabel(houses, planets, sl));
    }
    return Array.from(result);
  };

  const labelPlanets = (names: string[]): string[] => names.map((name) => planetKaryesLabel(houses, planets, name));

  return {
    house: houseNumber,
    subLord: house?.subLord || '',
    significatorsB: labelPlanets(occupants),
    significatorsC: owner ? [planetKaryesLabel(houses, planets, owner)] : [],
    significatorsA: starLordsOf(occupants),
    significatorsD: owner ? starLordsOf([owner]) : [],
  };
}

export interface CuspSubLordSignification {
  house: number;
  subLord?: string;
  byDeposition: number[];
  byOwnership: number[];
}

export function cuspSubLordSignification(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[],
  houseNumber: number
): CuspSubLordSignification {
  const house = houses.find((h) => h.house === houseNumber);
  const subLord = house?.subLord;
  return {
    house: houseNumber,
    subLord,
    byDeposition: housesOccupiedBy(planets, subLord),
    byOwnership: housesOwnedBy(houses, subLord),
  };
}
