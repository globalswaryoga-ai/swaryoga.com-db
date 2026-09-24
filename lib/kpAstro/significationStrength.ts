// Planet Signification & Strength table: for each planet, the houses
// deposited-in (Dep, i.e. occupied) and owned (Own) by its Star Lord, Sub
// Lord, conjunction partners, and opposition partners, plus the planet's
// own Dep/Own — matching the standard KP software reference layout.
//
// Conjunction uses the same per-planet orb table already established
// elsewhere in this codebase (aspectAnalysis.ts's computeConjunctions).
// Opposition uses the same orb table, checked near 180 degrees instead of 0.

import { housesOccupiedBy, housesOwnedBy, starLordOf, type SignificatorHouse, type SignificatorPlanet } from './significators';
import { computeConjunctions, longitudeOf } from './aspectAnalysis';

export interface DepOwn {
  dep: number[];
  own: number[];
}

export interface SignificationRow {
  planet: string;
  starLord?: string;
  starLordDepOwn: DepOwn;
  subLord?: string;
  subLordDepOwn: DepOwn;
  conjunctionLords: string[];
  conjunctionDepOwn: DepOwn;
  oppositionLords: string[];
  oppositionDepOwn: DepOwn;
  selfDepOwn: DepOwn;
}

function depOwnFor(lordName: string | undefined, houses: SignificatorHouse[], planets: SignificatorPlanet[]): DepOwn {
  if (!lordName) return { dep: [], own: [] };
  return { dep: housesOccupiedBy(planets, lordName), own: housesOwnedBy(houses, lordName) };
}

function mergeDepOwn(list: DepOwn[]): DepOwn {
  const dep = new Set<number>();
  const own = new Set<number>();
  for (const d of list) {
    d.dep.forEach((h) => dep.add(h));
    d.own.forEach((h) => own.add(h));
  }
  return { dep: Array.from(dep).sort((a, b) => a - b), own: Array.from(own).sort((a, b) => a - b) };
}

// Same orb table computeConjunctions uses (Sun 6.4 degrees, others 3.2),
// applied to a ~180 degree separation instead of ~0 for opposition pairs.
const ORB_DEFAULT = 3.2;
const ORB_SUN = 6.4;
function orbFor(planetName: string): number {
  return planetName === 'Sun' ? ORB_SUN : ORB_DEFAULT;
}

function findOppositionPartners(planet: SignificatorPlanet, all: SignificatorPlanet[]): string[] {
  const lon = longitudeOf(planet);
  if (Number.isNaN(lon)) return [];
  const partners: string[] = [];
  for (const other of all) {
    if (other.planet === planet.planet) continue;
    const otherLon = longitudeOf(other);
    if (Number.isNaN(otherLon)) continue;
    const diff = Math.abs(lon - otherLon) % 360;
    const separation = Math.min(diff, 360 - diff);
    const orb = Math.max(orbFor(planet.planet), orbFor(other.planet));
    if (Math.abs(separation - 180) <= orb) partners.push(other.planet);
  }
  return partners;
}

export function computeSignificationStrength(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[]
): SignificationRow[] {
  const conjunctions = computeConjunctions(planets);

  return planets.map((p) => {
    const starLord = starLordOf(p);
    const subLord = p.subLord;

    const conjunctionLords = conjunctions
      .filter((c) => c.planetA === p.planet || c.planetB === p.planet)
      .map((c) => (c.planetA === p.planet ? c.planetB : c.planetA));

    const oppositionLords = findOppositionPartners(p, planets);

    return {
      planet: p.planet,
      starLord,
      starLordDepOwn: depOwnFor(starLord, houses, planets),
      subLord,
      subLordDepOwn: depOwnFor(subLord, houses, planets),
      conjunctionLords,
      conjunctionDepOwn: mergeDepOwn(conjunctionLords.map((name) => depOwnFor(name, houses, planets))),
      oppositionLords,
      oppositionDepOwn: mergeDepOwn(oppositionLords.map((name) => depOwnFor(name, houses, planets))),
      selfDepOwn: { dep: housesOccupiedBy(planets, p.planet), own: housesOwnedBy(houses, p.planet) },
    };
  });
}

/** True if any Dep/Own group for this row references the given house. */
export function rowSignifiesHouse(row: SignificationRow, houseNum: number): boolean {
  const groups: DepOwn[] = [row.starLordDepOwn, row.subLordDepOwn, row.conjunctionDepOwn, row.oppositionDepOwn, row.selfDepOwn];
  return groups.some((g) => g.dep.includes(houseNum) || g.own.includes(houseNum));
}
