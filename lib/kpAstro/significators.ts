// Computes the standard KP "four-step" significators (A/B/C/D) for each
// planet, plus the cuspal Sub Lord's own significations for a house — purely
// from data already stored on the chart (houses[].signLord, planets[].house),
// no schema change or new lookup tables needed beyond the existing subTable.

import { findSubTableRow } from './index';

export interface SignificatorHouse {
  house: number;
  signLord?: string;
  subLord?: string;
}

export interface SignificatorPlanet {
  planet: string;
  sign?: string;
  star?: string;
  subLord?: string;
  house?: number;
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
