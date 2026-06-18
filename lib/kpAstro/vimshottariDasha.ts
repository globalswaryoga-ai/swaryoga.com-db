// Vimshottari Mahadasha sequence — a deterministic 120-year cycle derived
// purely from the Moon's sidereal position at birth, no ephemeris API call
// needed beyond that one value (already computed by ephemeris.ts). Output
// shape matches the existing chart schema's `mahadashas: [{ planet,
// startDate, endDate }]` field exactly, so this is just another way to
// populate a field that already exists — no schema change needed.

const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
const NAKSHATRA_SPAN = 360 / 27; // 13°20'
const DAYS_PER_YEAR = 365.25; // standard approximation used for Vimshottari date arithmetic

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export interface DashaPeriod {
  planet: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
}

// moonSiderealLongitude: 0-360. birthDate: the chart's actual birth instant.
// cycles: how many full 120-year cycles to generate after the first partial
// period (1 is enough for a human lifetime).
export function computeVimshottariDasha(moonSiderealLongitude: number, birthDate: Date, cycles = 1): DashaPeriod[] {
  const normalized = ((moonSiderealLongitude % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(normalized / NAKSHATRA_SPAN);
  const fractionTraversed = (normalized % NAKSHATRA_SPAN) / NAKSHATRA_SPAN;

  const startLordIndex = nakshatraIndex % DASHA_ORDER.length;
  const startLord = DASHA_ORDER[startLordIndex];
  const balanceYears = (1 - fractionTraversed) * DASHA_YEARS[startLord];

  const periods: DashaPeriod[] = [];
  let cursor = birthDate;

  // First (partial) period: whatever's left of the nakshatra's ruling dasha.
  let end = addDays(cursor, balanceYears * DAYS_PER_YEAR);
  periods.push({ planet: startLord, startDate: cursor.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
  cursor = end;

  // Full periods thereafter, cycling through the fixed order.
  const totalPeriods = DASHA_ORDER.length * cycles;
  for (let i = 1; i < totalPeriods; i++) {
    const lord = DASHA_ORDER[(startLordIndex + i) % DASHA_ORDER.length];
    end = addDays(cursor, DASHA_YEARS[lord] * DAYS_PER_YEAR);
    periods.push({ planet: lord, startDate: cursor.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
    cursor = end;
  }

  return periods;
}

// --- Deeper Vimshottari levels (Antardasha, Pratyantar, Sookshma, Prana) ---
// Each level subdivides its parent period among the same 9 dasha lords, in
// the same fixed cyclic order, starting from the parent's OWN lord — e.g. a
// Venus Mahadasha's Antardashas run Venus-Venus, Venus-Sun, Venus-Moon, ...
// continuing the DASHA_ORDER cycle from Venus. Each sub-period's length is
// proportional: parentDuration * (subLordYears / 120). This is the standard
// recursive Vimshottari subdivision rule, applied identically at every level.

export const DASHA_LEVELS = ['maha', 'antar', 'pratyantar', 'sookshma', 'prana'] as const;
export type DashaLevel = typeof DASHA_LEVELS[number];

export interface DashaLevelRow {
  level: DashaLevel;
  planet: string;
  parentPath: string; // e.g. "Ketu-Venus-Sun" for a Pratyantar row; '' for Maha
  startDate: string; // ISO date
  endDate: string; // ISO date
}

function subdivide(parentLord: string, start: Date, end: Date): Array<{ lord: string; start: Date; end: Date }> {
  const durationMs = end.getTime() - start.getTime();
  const startIndex = DASHA_ORDER.indexOf(parentLord);
  const rows: Array<{ lord: string; start: Date; end: Date }> = [];
  let cursor = start;
  for (let i = 0; i < DASHA_ORDER.length; i++) {
    const lord = DASHA_ORDER[(startIndex + i) % DASHA_ORDER.length];
    const periodMs = durationMs * (DASHA_YEARS[lord] / 120);
    const periodEnd = new Date(cursor.getTime() + periodMs);
    rows.push({ lord, start: cursor, end: periodEnd });
    cursor = periodEnd;
  }
  return rows;
}

// Recursively expands one period down to (and including) deepestLevel,
// returning every level along the way. Used both for the eager Maha->
// Pratyantar tree below and for on-demand Sookshma/Prana drill-down from
// any chosen parent period (see computeDashaSubLevels).
export function expandDashaPeriod(
  level: DashaLevel,
  parentPath: string,
  lord: string,
  start: Date,
  end: Date,
  deepestLevel: DashaLevel
): DashaLevelRow[] {
  const levelIndex = DASHA_LEVELS.indexOf(level);
  const deepestIndex = DASHA_LEVELS.indexOf(deepestLevel);
  const row: DashaLevelRow = {
    level,
    planet: lord,
    parentPath,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
  if (levelIndex >= deepestIndex) return [row];

  const newPath = parentPath ? `${parentPath}-${lord}` : lord;
  const children = subdivide(lord, start, end).flatMap((sub) =>
    expandDashaPeriod(DASHA_LEVELS[levelIndex + 1], newPath, sub.lord, sub.start, sub.end, deepestLevel)
  );
  return [row, ...children];
}

// Eager tree from birth: Maha (9 per cycle) down through Pratyantar by
// default (9x9x9 = 729 rows per cycle) — the depth KP practice routinely
// works at. Sookshma/Prana are deliberately NOT included here (9x more rows
// each level deeper, 59k+ at full Prana depth for one cycle) — compute those
// on demand for one chosen Pratyantar window via computeDashaSubLevels.
export function computeDashaTree(moonSiderealLongitude: number, birthDate: Date, deepestLevel: DashaLevel = 'pratyantar', cycles = 1): DashaLevelRow[] {
  const mahaPeriods = computeVimshottariDasha(moonSiderealLongitude, birthDate, cycles);
  return mahaPeriods.flatMap((m) =>
    expandDashaPeriod('maha', '', m.planet, new Date(m.startDate), new Date(m.endDate), deepestLevel)
  );
}

// On-demand drill-down: given one specific period the astrologer selected
// (any level), expand it down to deepestLevel. Excludes the parent row
// itself (already known/stored) — only returns the new, deeper rows.
export function computeDashaSubLevels(
  parentLevel: DashaLevel,
  parentPath: string,
  parentLord: string,
  parentStart: Date,
  parentEnd: Date,
  deepestLevel: DashaLevel
): DashaLevelRow[] {
  return expandDashaPeriod(parentLevel, parentPath, parentLord, parentStart, parentEnd, deepestLevel)
    .filter((row) => row.level !== parentLevel);
}
