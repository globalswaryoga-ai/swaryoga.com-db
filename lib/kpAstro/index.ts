// KP astrology reference data, extracted from the TFU MasterClass KP Astrology
// RuleBook. This is static lookup data (sign/star/sub boundaries, house
// significations, matter→house mapping) — it does not cast a live chart, so it
// cannot give a yes/no verdict on its own. A real prediction needs an actual
// planetary-position engine (ephemeris) layered on top of this reference data.

import subTableRaw from './subTable.json';
import diseasesRaw from './diseases.json';
import mindsetRaw from './mindset.json';
import professionsRaw from './professions.json';
import basicRulesRaw from './basicRules.json';
import housesMeaningRaw from './housesMeaning.json';
import aspectRaw from './aspect.json';
// General classical Vedic/KP reference, not extracted from the TFU toolkit —
// kept separate so it's easy to correct/expand independently of the rulebook data.
import gemstonesRaw from './gemstones.json';
import doshaRemediesRaw from './doshaRemedies.json';

export interface SubTableRow {
  no: number;
  sign: string;
  star: string;
  from: string;
  to: string;
  signLord: string;
  starLord: string;
  subLord: string;
}

export interface BasicRule {
  category: string | null;
  matter: string;
  primaryHouse: number | string | null;
  supportingHouses: string;
}

export const subTable = subTableRaw as SubTableRow[];
export const diseasesByNo = diseasesRaw as Record<string, string>;
export const mindsetByNo = mindsetRaw as Record<string, string>;
export const professionsByNo = professionsRaw as Record<string, string>;
export const basicRules = basicRulesRaw as BasicRule[];
export const housesMeaning = housesMeaningRaw as Record<string, string>;
export const aspectRules = aspectRaw as {
  beneficAngles: number[];
  maleficAngles: number[];
  orbs: Record<string, number>;
};
export const gemstoneByPlanet = gemstonesRaw as Record<string, string>;
export const doshaRemedies = doshaRemediesRaw as Record<string, string>;

export function getSubRow(no: number): SubTableRow | undefined {
  return subTable.find((r) => r.no === no);
}

// Finds the 249-division Sub Lord row matching a manually-entered house/planet
// position, so report generation can ground itself in the rulebook's
// disease/mindset/profession text instead of the AI inventing it.
export function findSubTableRow(sign?: string, star?: string, subLord?: string): SubTableRow | undefined {
  if (!sign || !star || !subLord) return undefined;
  const norm = (s: string) => s.trim().toLowerCase();
  return subTable.find(
    (r) => norm(r.sign) === norm(sign) && norm(r.star) === norm(star) && norm(r.subLord) === norm(subLord)
  );
}

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// Fixed rulership — every sign's traditional ruling planet.
export const SIGN_LORDS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

// subTable's `from`/`to` columns are degree-minute-second strings within the
// sign (0-30), written with inconsistent unicode prime/double-prime
// characters (″ ” ’ ′) — this normalizes any of them before parsing.
export function parseDegreeDms(dms: string): number {
  const cleaned = dms.replace(/[″”]/g, '"').replace(/[’′]/g, "'");
  const match = cleaned.match(/(\d+)°\s*(\d+)['′]\s*(\d+)/);
  if (!match) return NaN;
  const [, deg, min, sec] = match;
  return Number(deg) + Number(min) / 60 + Number(sec) / 3600;
}

// Finds the 249-division Sub Lord row containing a computed sidereal
// longitude (0-360), so an ephemeris-derived planet/house position can be
// mapped to a Sub Lord without the admin having to enter sign/star/subLord
// by hand.
export function findSubTableRowByLongitude(siderealDegree: number): SubTableRow | undefined {
  const normalized = ((siderealDegree % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const sign = ZODIAC_SIGNS[signIndex];
  const degreeInSign = normalized - signIndex * 30;
  return subTable.find((r) => {
    if (r.sign !== sign) return false;
    const from = parseDegreeDms(r.from);
    const to = parseDegreeDms(r.to);
    return degreeInSign >= from && degreeInSign < to;
  });
}

// Formats a decimal degree (0-30, within-sign) as a DMS string for display.
export function formatDegreeDms(degreeInSign: number): string {
  const deg = Math.floor(degreeInSign);
  const minFloat = (degreeInSign - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(2, '0')}"`;
}

// Parses "2, 6, 11" / "5 = 3, 5, 8, 11, 2, 6" style strings into house numbers.
export function parseHouseList(s: string | null | undefined): number[] {
  if (!s) return [];
  const matches = s.match(/\d+/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map(Number))).filter((n) => n >= 1 && n <= 12);
}

export function getHouseMeaning(house: number): string {
  return housesMeaning[String(house)] || '';
}
