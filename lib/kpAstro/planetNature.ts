// Malefic/Benefic "Nature" classification for KP Astro tables.
//
// Two distinct rules, used in two distinct places (per astrologer sign-off):
//   - naturalNature(): fixed/traditional classification, used in the
//     per-PLANET table (Houses & Planets -> Planets view). Sun/Mars/Saturn/
//     Rahu/Ketu are always malefic, Jupiter/Venus always benefic. Moon
//     depends on waxing/waning; Mercury depends on conjunction with a
//     natural malefic (classical exceptions, not chart-lordship-based).
//   - functionalNature(): per-ascendant classification for the Bhav/Karyesh
//     work area, based on which houses a planet owns for THIS chart: a
//     trikona (1/5/9) lord is benefic, a dusthana (6/8/12) lord is malefic
//     (dusthana ownership overrides trikona if a planet owns both), a
//     kendra-only lord (4/7/10, since 1 is covered by trikona) is neutral.

import type { SignificatorHouse, SignificatorPlanet } from './significators';
import { longitudeOf } from './aspectAnalysis';

export type PlanetNature = 'Benefic' | 'Malefic' | 'Neutral';

const FIXED_MALEFIC = new Set(['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']);
const FIXED_BENEFIC = new Set(['Jupiter', 'Venus']);

// Generous same-house-ish orb for "conjunct a malefic" checks below — not
// the tight orb used for real conjunction detection in aspectAnalysis.ts,
// just enough to catch "sitting together in the same house."
const NATURE_CONJUNCTION_ORB = 12;

function isConjunctFixedMalefic(planet: SignificatorPlanet, allPlanets: SignificatorPlanet[]): boolean {
  const lon = longitudeOf(planet);
  if (Number.isNaN(lon)) return false;
  return allPlanets.some((other) => {
    if (other.planet === planet.planet || !FIXED_MALEFIC.has(other.planet)) return false;
    const otherLon = longitudeOf(other);
    if (Number.isNaN(otherLon)) return false;
    const diff = Math.abs(lon - otherLon) % 360;
    return Math.min(diff, 360 - diff) <= NATURE_CONJUNCTION_ORB;
  });
}

/** Fixed/traditional nature — used for the per-planet table. */
export function naturalNature(planet: SignificatorPlanet, allPlanets: SignificatorPlanet[]): PlanetNature {
  const name = planet.planet;
  if (FIXED_MALEFIC.has(name)) return 'Malefic';
  if (FIXED_BENEFIC.has(name)) return 'Benefic';

  if (name === 'Moon') {
    const sun = allPlanets.find((p) => p.planet === 'Sun');
    const moonLon = longitudeOf(planet);
    const sunLon = sun ? longitudeOf(sun) : NaN;
    if (!sun || Number.isNaN(moonLon) || Number.isNaN(sunLon)) return 'Benefic';
    const diff = ((moonLon - sunLon) % 360 + 360) % 360;
    return diff > 0 && diff < 180 ? 'Benefic' : 'Malefic'; // waxing = benefic, waning = malefic
  }

  if (name === 'Mercury') {
    return isConjunctFixedMalefic(planet, allPlanets) ? 'Malefic' : 'Benefic';
  }

  return 'Neutral';
}

// Houses whose lordship reads as functionally supportive in this app's
// existing Bhav/Karyesh convention (kendra + trikona + 2nd, i.e. 1/2/4/5/7/9/10)
// — matches the rule already in production use in PlanetKaryeshTable.
const STRONG_BENEFIC_HOUSES = new Set([1, 2, 4, 5, 7, 9, 10]);

/**
 * Per-ascendant functional nature — used for the Bhav/Karyesh work area.
 * This is the existing app convention (previously duplicated inline in
 * PlanetKaryeshTable.tsx): Rahu is always treated as functionally
 * supportive and Ketu as functionally opposing, regardless of lordship;
 * every other planet is benefic if it owns any of the "strong" houses
 * above, malefic otherwise.
 */
export function functionalNature(planetName: string, houses: SignificatorHouse[]): PlanetNature {
  if (planetName === 'Rahu') return 'Benefic';
  if (planetName === 'Ketu') return 'Malefic';

  const owned = houses.filter((h) => h.signLord === planetName).map((h) => h.house);
  if (!owned.length) {
    return FIXED_BENEFIC.has(planetName) || planetName === 'Mercury' || planetName === 'Moon' ? 'Benefic' : 'Malefic';
  }
  return owned.some((h) => STRONG_BENEFIC_HOUSES.has(h)) ? 'Benefic' : 'Malefic';
}
