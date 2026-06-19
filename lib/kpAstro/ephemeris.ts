// Computes real planetary positions and house cusps via Swiss Ephemeris
// (swisseph-wasm), instead of requiring the admin to type them in by hand.
// Confirmed working on Vercel's serverless environment via a Phase-0 spike
// (see next.config.js externals — required to avoid the same webpack/RSC
// bundling failure that killed the project's earlier native-`swisseph`
// attempt for the Panchang feature).
//
// KP astrology requires the Krishnamurti ayanamsa (SE_SIDM_KRISHNAMURTI),
// not Lahiri — they differ by only a few arc-minutes, but that's enough to
// flip a Sub Lord at a boundary. The very first chart computed with this
// should be cross-checked against a known chart from the admin's existing
// software before trusting this broadly.

import { findSubTableRowByLongitude, formatDegreeDms, ZODIAC_SIGNS } from './index';

export interface ComputedPosition {
  siderealLongitude: number;
  sign: string;
  signLord: string;
  star: string;
  starLord: string;
  subLord: string;
  degree: string;
}

export interface ComputedChart {
  julianDay: number;
  ascendant: ComputedPosition;
  houses: Array<{ house: number } & ComputedPosition>;
  planets: Array<{ planet: string; house: number; retrograde: boolean } & ComputedPosition>;
}

const PLANETS: Array<{ name: string; id: number }> = [
  { name: 'Sun', id: 0 },
  { name: 'Moon', id: 1 },
  { name: 'Mercury', id: 2 },
  { name: 'Venus', id: 3 },
  { name: 'Mars', id: 4 },
  { name: 'Jupiter', id: 5 },
  { name: 'Saturn', id: 6 },
];
const SE_MEAN_NODE = 10; // Rahu — mean node, the traditional Vedic/KP default
const SEFLG_SWIEPH = 2;
const SEFLG_SIDEREAL = 65536;
const SE_SIDM_KRISHNAMURTI = 5;

let swePromise: Promise<any> | null = null;

async function getSwe() {
  if (!swePromise) {
    swePromise = (async () => {
      const mod: any = await import('swisseph-wasm');
      const SwissEph = mod.default;
      const swe = new SwissEph();
      await swe.initSwissEph();
      swe.set_sid_mode(SE_SIDM_KRISHNAMURTI, 0, 0);
      return swe;
    })();
  }
  return swePromise;
}

function positionFromLongitude(siderealLongitude: number): ComputedPosition {
  const normalized = ((siderealLongitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized - signIndex * 30;
  const row = findSubTableRowByLongitude(normalized);
  return {
    siderealLongitude: normalized,
    sign: ZODIAC_SIGNS[signIndex],
    signLord: row?.signLord || '',
    star: row?.star || '',
    starLord: row?.starLord || '',
    subLord: row?.subLord || '',
    degree: formatDegreeDms(degreeInSign),
  };
}

function houseOfLongitude(siderealLongitude: number, cuspsSidereal: number[]): number {
  const normalized = ((siderealLongitude % 360) + 360) % 360;
  for (let h = 1; h <= 12; h++) {
    const from = cuspsSidereal[h];
    const to = cuspsSidereal[h === 12 ? 1 : h + 1];
    const inRange = from <= to ? normalized >= from && normalized < to : normalized >= from || normalized < to;
    if (inRange) return h;
  }
  return 1;
}

// utcOffsetHours: decimal hours, e.g. India Standard Time = 5.5
export async function computeChart(params: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  utcOffsetHours: number;
  latitude: number;
  longitude: number;
}): Promise<ComputedChart> {
  const swe = await getSwe();

  const localHour = params.hour + params.minute / 60;
  const utcHour = localHour - params.utcOffsetHours;
  const jd = swe.julday(params.year, params.month, params.day, utcHour);

  const houseResult = swe.houses_ex(jd, SEFLG_SIDEREAL, params.latitude, params.longitude, 'P');
  const cuspsSidereal: number[] = Array.from(houseResult.cusps as Float64Array);
  const ascendantLongitude = houseResult.ascmc[0];

  const houses: ComputedChart['houses'] = [];
  for (let h = 1; h <= 12; h++) {
    houses.push({ house: h, ...positionFromLongitude(cuspsSidereal[h]) });
  }

  const planets: ComputedChart['planets'] = [];
  for (const p of PLANETS) {
    const pos = swe.calc_ut(jd, p.id, SEFLG_SWIEPH | SEFLG_SIDEREAL);
    const longitude = pos[0];
    const retrograde = pos[3] < 0; // negative daily motion in longitude = retrograde
    planets.push({ planet: p.name, house: houseOfLongitude(longitude, cuspsSidereal), retrograde, ...positionFromLongitude(longitude) });
  }

  const rahuPos = swe.calc_ut(jd, SE_MEAN_NODE, SEFLG_SWIEPH | SEFLG_SIDEREAL);
  const rahuLongitude = rahuPos[0];
  const ketuLongitude = (rahuLongitude + 180) % 360;
  // Rahu/Ketu (lunar nodes) are conventionally always treated as retrograde in Vedic/KP practice.
  planets.push({ planet: 'Rahu', house: houseOfLongitude(rahuLongitude, cuspsSidereal), retrograde: true, ...positionFromLongitude(rahuLongitude) });
  planets.push({ planet: 'Ketu', house: houseOfLongitude(ketuLongitude, cuspsSidereal), retrograde: true, ...positionFromLongitude(ketuLongitude) });

  return {
    julianDay: jd,
    ascendant: positionFromLongitude(ascendantLongitude),
    houses,
    planets,
  };
}

const TRANSIT_PLANET_IDS: Record<string, number> = { Sun: 0, Moon: 1 };

// Geocentric sidereal position of Sun/Moon at a given UTC instant — used for
// transit event-timing searches (KP's "Sun transit narrows to the year, Moon
// transit narrows to the month/day" technique). No observer location needed:
// Sun/Moon's sign/star/sub is the same everywhere on Earth at a given moment.
export async function computeTransitPosition(date: Date, planet: 'Sun' | 'Moon'): Promise<ComputedPosition> {
  const swe = await getSwe();
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), utcHour);
  const pos = swe.calc_ut(jd, TRANSIT_PLANET_IDS[planet], SEFLG_SWIEPH | SEFLG_SIDEREAL);
  return positionFromLongitude(pos[0]);
}

// Transiting Lagna (Ascendant) at a given UTC instant, for a specific
// observer location — this DOES depend on location/time-of-day, unlike
// Sun/Moon above. Used for the final hour-level refinement step (the Lagna
// completes one full 360° cycle roughly every ~24h, close to a solar day).
export async function computeTransitLagna(date: Date, latitude: number, longitude: number): Promise<ComputedPosition> {
  const swe = await getSwe();
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), utcHour);
  const houseResult = swe.houses_ex(jd, SEFLG_SIDEREAL, latitude, longitude, 'P');
  const ascendantLongitude = houseResult.ascmc[0];
  return positionFromLongitude(ascendantLongitude);
}
