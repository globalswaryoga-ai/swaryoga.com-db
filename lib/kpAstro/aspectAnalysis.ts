// Conjunctions and drishti (planetary aspects) between the 9 stored planets.
//
// Conjunction: real angular closeness, using the orb table in aspect.json
// (Sun 6°40' [decimal 6.4], all other planets 3°20' [decimal 3.2] — confirmed
// against the live chart). Positions are stored as sign + within-sign DMS
// degree (e.g. "20°12'44\""), not raw longitude — longitudeOf() reconstructs
// longitude with the exact inverse of how ephemeris.ts derives sign/degree.
//
// Drishti: classical Parashari special aspects, counted by HOUSE, not by
// degree angle — every planet aspects the 7th house from its own house;
// Mars also aspects the 4th and 8th, Jupiter the 5th and 9th, Saturn the
// 3rd and 10th (confirmed against the standard rule, used as KP's default
// too unless a chart specifically overrides it).

import { ZODIAC_SIGNS, aspectRules, parseDegreeDms } from './index';

export interface AspectPlanet {
  planet: string;
  sign?: string;
  degree?: string;
  house?: number;
}

// aspectRules.orbs keys group several planets under one comma-joined string
// and use a few abbreviations — expand into a per-planet lookup.
const PLANET_ABBREVIATIONS: Record<string, string> = {
  Jup: 'Jupiter',
  Ven: 'Venus',
  Sat: 'Saturn',
  Mer: 'Mercury',
};

function buildOrbByPlanet(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, orb] of Object.entries(aspectRules.orbs)) {
    for (const token of key.split(',').map((t) => t.trim()).filter(Boolean)) {
      const name = PLANET_ABBREVIATIONS[token] || token;
      result[name] = orb;
    }
  }
  return result;
}

export const ORB_BY_PLANET = buildOrbByPlanet();

export function longitudeOf(planet: AspectPlanet): number {
  const signIndex = planet.sign ? ZODIAC_SIGNS.indexOf(planet.sign) : -1;
  if (signIndex === -1 || !planet.degree) return NaN;
  return signIndex * 30 + parseDegreeDms(planet.degree);
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

export interface DetectedConjunction {
  planetA: string;
  planetB: string;
  separation: number;
  orbUsed: number;
}

export function computeConjunctions(planets: AspectPlanet[]): DetectedConjunction[] {
  const withLongitude = planets
    .map((p) => ({ ...p, longitude: longitudeOf(p) }))
    .filter((p) => !Number.isNaN(p.longitude));

  const results: DetectedConjunction[] = [];
  for (let i = 0; i < withLongitude.length; i++) {
    for (let j = i + 1; j < withLongitude.length; j++) {
      const a = withLongitude[i];
      const b = withLongitude[j];
      const separation = angularSeparation(a.longitude, b.longitude);
      const orbUsed = Math.max(ORB_BY_PLANET[a.planet] ?? 0, ORB_BY_PLANET[b.planet] ?? 0);
      if (separation <= orbUsed) {
        results.push({ planetA: a.planet, planetB: b.planet, separation, orbUsed });
      }
    }
  }
  return results;
}

// Planets whose stored degree string didn't parse (e.g. malformed hand
// entry) and were therefore excluded from the conjunction check above.
export function unparseablePlanets(planets: AspectPlanet[]): string[] {
  return planets.filter((p) => Number.isNaN(longitudeOf(p))).map((p) => p.planet);
}

// House offsets a planet aspects FROM its own occupied house, counted
// inclusively (the occupied house itself = 1st). Confirmed: Mars 4-7-8,
// Jupiter 5-7-9, Saturn 3-7-10; every other planet aspects only the 7th.
export const SPECIAL_ASPECT_OFFSETS: Record<string, number[]> = {
  Mars: [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10],
};
export const DEFAULT_ASPECT_OFFSETS = [7];

function nthHouseFrom(house: number, n: number): number {
  return ((house - 1 + (n - 1)) % 12) + 1;
}

export function housesAspectedBy(planetName: string, occupiedHouse: number): number[] {
  const offsets = SPECIAL_ASPECT_OFFSETS[planetName] || DEFAULT_ASPECT_OFFSETS;
  return offsets.map((n) => nthHouseFrom(occupiedHouse, n));
}

export interface DrishtiOnHouse {
  planet: string;
  fromHouse: number;
  toHouse: number;
}

// Every drishti hit, as "this planet (sitting in fromHouse) aspects toHouse".
export function computeDrishtiOnHouses(planets: AspectPlanet[]): DrishtiOnHouse[] {
  const hits: DrishtiOnHouse[] = [];
  for (const p of planets) {
    if (!p.house) continue;
    for (const toHouse of housesAspectedBy(p.planet, p.house)) {
      hits.push({ planet: p.planet, fromHouse: p.house, toHouse });
    }
  }
  return hits;
}

export interface DrishtiOnPlanet {
  from: string;
  to: string;
  toHouse: number;
}

// Planet-to-planet drishti: does `from`'s aspect land on the house `to` sits in?
export function computeDrishtiOnPlanets(planets: AspectPlanet[]): DrishtiOnPlanet[] {
  const withHouse = planets.filter((p) => p.house);
  const results: DrishtiOnPlanet[] = [];
  for (const a of withHouse) {
    const aspectedHouses = new Set(housesAspectedBy(a.planet, a.house!));
    for (const b of withHouse) {
      if (a.planet === b.planet) continue;
      if (aspectedHouses.has(b.house!)) {
        results.push({ from: a.planet, to: b.planet, toHouse: b.house! });
      }
    }
  }
  return results;
}

// Planets with no stored house at all — drishti can't be computed for these.
export function planetsMissingHouse(planets: AspectPlanet[]): string[] {
  return planets.filter((p) => !p.house).map((p) => p.planet);
}
