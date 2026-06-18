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
