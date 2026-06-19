// Detects conjunctions and drishti (aspects) between the 9 stored planets,
// using the angle/orb reference table already in aspect.json (lib/kpAstro/
// index.ts's aspectRules) applied to real computed/entered positions.
//
// Planet positions are stored as sign + within-sign DMS degree (e.g.
// "20°12'44\""), not raw longitude — this reconstructs longitude with the
// exact inverse of how ephemeris.ts derives sign/degree in the first place.

import { ZODIAC_SIGNS, aspectRules, parseDegreeDms } from './index';

export interface AspectPlanet {
  planet: string;
  sign?: string;
  degree?: string;
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

const ORB_BY_PLANET = buildOrbByPlanet();

export function longitudeOf(planet: AspectPlanet): number {
  const signIndex = planet.sign ? ZODIAC_SIGNS.indexOf(planet.sign) : -1;
  if (signIndex === -1 || !planet.degree) return NaN;
  return signIndex * 30 + parseDegreeDms(planet.degree);
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

export type AspectType = 'conjunction' | 'malefic' | 'benefic';

export interface DetectedAspect {
  planetA: string;
  planetB: string;
  separation: number;
  targetAngle: number;
  orbUsed: number;
  type: AspectType;
}

export function computeAspectsAndConjunctions(planets: AspectPlanet[]): DetectedAspect[] {
  const withLongitude = planets
    .map((p) => ({ ...p, longitude: longitudeOf(p) }))
    .filter((p) => !Number.isNaN(p.longitude));

  const results: DetectedAspect[] = [];

  for (let i = 0; i < withLongitude.length; i++) {
    for (let j = i + 1; j < withLongitude.length; j++) {
      const a = withLongitude[i];
      const b = withLongitude[j];
      const separation = angularSeparation(a.longitude, b.longitude);
      const orbUsed = Math.max(ORB_BY_PLANET[a.planet] ?? 0, ORB_BY_PLANET[b.planet] ?? 0);

      const checks: Array<{ angle: number; type: AspectType }> = [
        { angle: 0, type: 'conjunction' },
        ...aspectRules.maleficAngles.filter((angle) => angle !== 0).map((angle) => ({ angle, type: 'malefic' as const })),
        ...aspectRules.beneficAngles.map((angle) => ({ angle, type: 'benefic' as const })),
      ];

      for (const { angle, type } of checks) {
        if (Math.abs(separation - angle) <= orbUsed) {
          results.push({ planetA: a.planet, planetB: b.planet, separation, targetAngle: angle, orbUsed, type });
          break; // a pair matches at most one angle category
        }
      }
    }
  }

  return results;
}

// Planets whose stored degree string didn't parse (e.g. malformed hand entry)
// and were therefore excluded from the comparisons above.
export function unparseablePlanets(planets: AspectPlanet[]): string[] {
  return planets.filter((p) => Number.isNaN(longitudeOf(p))).map((p) => p.planet);
}
