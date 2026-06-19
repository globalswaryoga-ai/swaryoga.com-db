// KP event-timing: identifies which planets signify a set of target houses
// (e.g. marriage = 2, 7, 11), finds Dasha windows where the running
// Mahadasha-Antardasha-Pratyantardasha chain matches those significators,
// then refines the exact date/hour within each window via transit — Sun
// narrows to the year/window, Moon narrows further to specific days within
// it, and (given a birthplace) the transiting Lagna narrows to the hour.
//
// Confirmed against the standard KP technique (dasha-bhukti-antara chain +
// transit confirmation, the same logic behind KP's "Ruling Planets" method).
// One piece the rulebook didn't spell out precisely anywhere verifiable:
// the exact "9-day" framing for day-level refinement. Implemented here as
// Moon transiting the specific Sub-lord division (1 of 9 Vimshottari-
// proportional portions of its Nakshatra) matching the significator chain —
// the real mechanism KP uses for day-level refinement — flagged separately
// as `moonSubMatch` so this can be tightened later if the exact rule turns
// out to differ.

import { computeFourStepSignificators, type SignificatorHouse, type SignificatorPlanet } from './significators';
import type { DashaLevelRow } from './vimshottariDasha';
import { computeTransitPosition, computeTransitLagna } from './ephemeris';

export interface EventSignificator {
  planet: string;
  matchedHouses: number[];
}

// Which planets signify ANY of the target houses, via the standard 4-step
// (A/B/C/D) method — these are the planets whose Dasha periods can deliver
// the event.
export function findEventSignificators(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[],
  targetHouses: number[]
): EventSignificator[] {
  const allSig = computeFourStepSignificators(houses, planets);
  return allSig
    .map((s) => {
      const allHouses = [...s.A, ...s.B, ...s.C, ...s.D];
      const matchedHouses = targetHouses.filter((h) => allHouses.includes(h));
      return { planet: s.planet, matchedHouses };
    })
    .filter((s) => s.matchedHouses.length > 0);
}

export interface DashaChainWindow {
  mahaLord: string;
  antarLord: string;
  pratyantarLord: string;
  startDate: string;
  endDate: string;
  matchedLevels: number; // how many of the 3 running lords are significators
}

// Scans the Pratyantardasha level of the tree for windows where the running
// Maha-Antar-Pratyantar chain is (at least partly) made of the event's
// significators — the standard KP rule for "which period can deliver this
// event." Requires at least 2 of the 3 levels to match (requiring all 3 is
// the textbook ideal but rarely all three line up in any real chart).
export function findDashaChainWindows(
  dashaTree: DashaLevelRow[],
  significators: EventSignificator[],
  searchFrom?: Date,
  searchUntil?: Date
): DashaChainWindow[] {
  const sigPlanets = new Set(significators.map((s) => s.planet));
  const pratyantarRows = dashaTree.filter((r) => r.level === 'pratyantar');

  const results: DashaChainWindow[] = [];
  for (const pr of pratyantarRows) {
    const [mahaLord, antarLord] = pr.parentPath.split('-');
    const pratyantarLord = pr.planet;
    const matchedLevels = [mahaLord, antarLord, pratyantarLord].filter((l) => sigPlanets.has(l)).length;
    if (matchedLevels < 2) continue;

    if (searchFrom && new Date(pr.endDate) < searchFrom) continue;
    if (searchUntil && new Date(pr.startDate) > searchUntil) continue;

    results.push({ mahaLord, antarLord, pratyantarLord, startDate: pr.startDate, endDate: pr.endDate, matchedLevels });
  }

  return results.sort(
    (a, b) => b.matchedLevels - a.matchedLevels || new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

export interface DailyTransitMatch {
  date: string; // ISO date (UTC midnight-anchored sample)
  sunMatchStrength: number; // 0-3: how many of sign/star/sub-lord are significators
  moonMatchStrength: number; // 0-3
  sunMatch: boolean;
  moonMatch: boolean;
  moonSubMatch: boolean;
}

function matchStrength(pos: { signLord: string; starLord: string; subLord: string }, sigSet: Set<string>): number {
  return [pos.signLord, pos.starLord, pos.subLord].filter((p) => sigSet.has(p)).length;
}

// Within one matched Pratyantardasha window, scans day-by-day for dates
// where Sun and/or Moon's own sign/star/sub-lord is also one of the
// significator planets — KP's transit-confirmation step. Reports how many
// of the three levels (sign/star/sub) align, not just a yes/no match, so
// the strongest day can be picked out (a chart with many significators
// naturally produces a lot of single-level "hits" — strength tells those
// apart from a genuine triple-level alignment).
export async function refineWindowByTransit(
  window: { startDate: string; endDate: string },
  significatorPlanets: string[]
): Promise<DailyTransitMatch[]> {
  const sigSet = new Set(significatorPlanets);
  const start = new Date(window.startDate);
  const end = new Date(window.endDate);
  const maxDays = 400; // defensive cap — Pratyantardasha windows are normally weeks-to-months
  const results: DailyTransitMatch[] = [];

  let cursor = new Date(start);
  let i = 0;
  while (cursor <= end && i < maxDays) {
    const sunPos = await computeTransitPosition(cursor, 'Sun');
    const moonPos = await computeTransitPosition(cursor, 'Moon');
    const sunMatchStrength = matchStrength(sunPos, sigSet);
    const moonMatchStrength = matchStrength(moonPos, sigSet);
    if (sunMatchStrength > 0 || moonMatchStrength > 0) {
      results.push({
        date: cursor.toISOString().slice(0, 10),
        sunMatchStrength,
        moonMatchStrength,
        sunMatch: sunMatchStrength > 0,
        moonMatch: moonMatchStrength > 0,
        moonSubMatch: sigSet.has(moonPos.subLord),
      });
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    i++;
  }
  return results;
}

export interface HourlyLagnaMatch {
  hour: number; // local hour 0-23
  lagnaSign: string;
  match: boolean;
}

// Final hour-level refinement for one already-chosen date — scans the 24
// local hours for when the transiting Lagna's sign/star/sub is also one of
// the significator planets (the Lagna completes one full 360° cycle
// roughly every ~24h, close to a solar day).
export async function refineDayByLagna(
  localDate: Date,
  latitude: number,
  longitude: number,
  utcOffsetHours: number,
  significatorPlanets: string[]
): Promise<HourlyLagnaMatch[]> {
  const sigSet = new Set(significatorPlanets);
  const results: HourlyLagnaMatch[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const utcInstant = new Date(
      Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), hour - utcOffsetHours)
    );
    const lagna = await computeTransitLagna(utcInstant, latitude, longitude);
    const match = sigSet.has(lagna.signLord) || sigSet.has(lagna.starLord) || sigSet.has(lagna.subLord);
    results.push({ hour, lagnaSign: lagna.sign, match });
  }
  return results;
}
