// Western-style degree-based planetary aspects (distinct from the Parashari
// house-counting drishti in aspectAnalysis.ts) — conjunction through
// opposition, each with its own orb, matching the standard KP software
// "Planetary Aspects" grid. Conjunction and Opposition use the toolkit's own
// per-planet orb table (aspect.json: Sun 6.4 deg, all other planets 3.2 deg —
// same rule computeConjunctions() already applies elsewhere in this app) so
// both parts of the app agree; the remaining aspect types keep a flat orb
// since nothing else in this app makes a per-planet distinction for them.

import type { SignificatorPlanet } from './significators';
import { longitudeOf, ORB_BY_PLANET } from './aspectAnalysis';

export type AspectType =
  | 'Conjunction' | 'Semi-sextile' | 'Semi-square' | 'Sextile'
  | 'Square' | 'Trine' | 'Sesquisquare' | 'Quincunx' | 'Opposition';

interface AspectDef {
  name: AspectType;
  angle: number;
  orb: number;
}

const ASPECT_DEFS: AspectDef[] = [
  { name: 'Conjunction', angle: 0, orb: 8 },
  { name: 'Semi-sextile', angle: 30, orb: 2 },
  { name: 'Semi-square', angle: 45, orb: 2 },
  { name: 'Sextile', angle: 60, orb: 4 },
  { name: 'Square', angle: 90, orb: 6 },
  { name: 'Trine', angle: 120, orb: 6 },
  { name: 'Sesquisquare', angle: 135, orb: 2 },
  { name: 'Quincunx', angle: 150, orb: 2 },
  { name: 'Opposition', angle: 180, orb: 8 },
];

export const ASPECT_TYPES: AspectType[] = ASPECT_DEFS.map((d) => d.name);
export const ASPECT_ANGLES: Record<AspectType, number> = Object.fromEntries(
  ASPECT_DEFS.map((d) => [d.name, d.angle])
) as Record<AspectType, number>;

export interface PlanetAspectRow {
  planet: string;
  aspects: Record<AspectType, string[]>; // other planet(s) in that aspect relationship
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

function emptyAspectMap(): Record<AspectType, string[]> {
  const map = {} as Record<AspectType, string[]>;
  for (const type of ASPECT_TYPES) map[type] = [];
  return map;
}

/**
 * For each planet, finds every other planet within orb of each classical
 * aspect angle. When a separation falls within more than one aspect's orb
 * (rare, only near shared boundaries), the closest-angle aspect wins.
 */
export function computePlanetaryAspects(planets: SignificatorPlanet[]): PlanetAspectRow[] {
  const withLongitude = planets.map((p) => ({ ...p, longitude: longitudeOf(p) }));

  return withLongitude.map((p) => {
    const aspects = emptyAspectMap();
    if (!Number.isNaN(p.longitude)) {
      for (const other of withLongitude) {
        if (other.planet === p.planet || Number.isNaN(other.longitude)) continue;
        const separation = angularSeparation(p.longitude, other.longitude);
        let best: { name: AspectType; diff: number } | null = null;
        for (const def of ASPECT_DEFS) {
          const orb = def.name === 'Conjunction' || def.name === 'Opposition'
            ? Math.max(ORB_BY_PLANET[p.planet] ?? def.orb, ORB_BY_PLANET[other.planet] ?? def.orb)
            : def.orb;
          const diff = Math.abs(separation - def.angle);
          if (diff <= orb && (!best || diff < best.diff)) best = { name: def.name, diff };
        }
        if (best) aspects[best.name].push(other.planet);
      }
    }
    return { planet: p.planet, aspects };
  });
}
