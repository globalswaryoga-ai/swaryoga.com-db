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

export function getSubRow(no: number): SubTableRow | undefined {
  return subTable.find((r) => r.no === no);
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
