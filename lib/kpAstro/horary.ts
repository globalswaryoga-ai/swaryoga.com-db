// KP Horary (Prashna Kundali): casts a chart from a 1-249 horary number
// instead of a birth moment. The querent (or astrologer) picks a number;
// that number directly identifies which of the 249 KP sub-divisions the
// ascendant falls in — the same subTable.json used for natal sub-lord
// lookups doubles as the horary number table (each row's `.no` IS the
// horary number).
//
// Simplification, flagged clearly (cross-check against existing KP horary
// software before trusting this broadly, same caution as ephemeris.ts):
// houses are equal-division from the horary ascendant (cusp N = ascendant +
// (N-1)*30 degrees) rather than a true Placidus recompute anchored to a
// forced ascendant — Swiss Ephemeris's house engine derives the ascendant
// FROM time+place, it doesn't accept a fixed ascendant as input. Equal
// houses are a long-accepted simplification specifically for horary (the
// house *cusp sub-lord* is what KP horary judgment hinges on, not Placidus
// precision). The ascendant degree itself is taken as the midpoint of the
// horary number's sub-table range.

import { getSubRow, findSubTableRowByLongitude, formatDegreeDms, ZODIAC_SIGNS } from './index';
import { computeChart, type ComputedPosition } from './ephemeris';

function parseDms(dms: string): number {
  const cleaned = dms.replace(/[″”]/g, '"').replace(/[’′]/g, "'");
  const match = cleaned.match(/(\d+)°\s*(\d+)['′]\s*(\d+)/);
  if (!match) return NaN;
  const [, deg, min, sec] = match;
  return Number(deg) + Number(min) / 60 + Number(sec) / 3600;
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
    const from = cuspsSidereal[h - 1];
    const to = cuspsSidereal[h === 12 ? 0 : h];
    const inRange = from <= to ? normalized >= from && normalized < to : normalized >= from || normalized < to;
    if (inRange) return h;
  }
  return 1;
}

// Horary number (1-249) -> absolute sidereal ascendant degree (0-360),
// taken as the midpoint of that number's sub-table degree range within its sign.
function horaryNumberToAscendantLongitude(horaryNumber: number): number {
  const row = getSubRow(horaryNumber);
  if (!row) throw new Error(`No sub-table row found for horary number ${horaryNumber} (must be 1-249)`);
  const signIndex = ZODIAC_SIGNS.indexOf(row.sign);
  if (signIndex === -1) throw new Error(`Unrecognized sign "${row.sign}" for horary number ${horaryNumber}`);
  const from = parseDms(row.from);
  const to = parseDms(row.to);
  const midpointInSign = (from + to) / 2;
  return signIndex * 30 + midpointInSign;
}

export interface HoraryChartResult {
  ascendant: ComputedPosition;
  houses: Array<{ house: number } & ComputedPosition>;
  planets: Array<{ planet: string; house: number; retrograde: boolean } & ComputedPosition>;
}

export async function castHoraryChart(params: {
  horaryNumber: number;
  askedAt: Date;
  latitude: number;
  longitude: number;
  utcOffsetHours: number;
}): Promise<HoraryChartResult> {
  const ascendantLongitude = horaryNumberToAscendantLongitude(params.horaryNumber);

  // Equal-house cusps from the horary ascendant.
  const cuspsSidereal: number[] = Array.from({ length: 12 }, (_, i) => ((ascendantLongitude + i * 30) % 360 + 360) % 360);
  const houses: HoraryChartResult['houses'] = cuspsSidereal.map((cusp, i) => ({ house: i + 1, ...positionFromLongitude(cusp) }));

  // Real planetary positions at the question's moment+place (only the
  // ascendant/houses are horary-anchored; planets are the actual sky).
  const shifted = new Date(params.askedAt.getTime() + params.utcOffsetHours * 3600000);
  const natural = await computeChart({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    utcOffsetHours: params.utcOffsetHours,
    latitude: params.latitude,
    longitude: params.longitude,
  });

  const planets: HoraryChartResult['planets'] = natural.planets.map((p) => ({
    planet: p.planet,
    house: houseOfLongitude(p.siderealLongitude, cuspsSidereal),
    retrograde: p.retrograde,
    ...positionFromLongitude(p.siderealLongitude),
  }));

  return { ascendant: positionFromLongitude(ascendantLongitude), houses, planets };
}
