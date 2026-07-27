// Per-planet accent colors for the light-themed Astrologer Workspace UI —
// loosely follows traditional Vedic color associations (Sun=orange/copper,
// Moon=silvery blue, Mars=red, Mercury=green, Jupiter=gold, Venus=pink,
// Saturn=indigo/dark, Rahu=smoky brown, Ketu=grey) so a planet's badge is
// recognizable at a glance across every table, not just colored for
// decoration.

export interface PlanetColor {
  bg: string;   // badge background
  text: string; // badge text
  chip: string; // light chip background for inline use in dense cells
}

export const PLANET_COLORS: Record<string, PlanetColor> = {
  Sun: { bg: 'bg-orange-500', text: 'text-white', chip: 'bg-orange-50 text-orange-700' },
  Moon: { bg: 'bg-sky-500', text: 'text-white', chip: 'bg-sky-50 text-sky-700' },
  Mars: { bg: 'bg-red-600', text: 'text-white', chip: 'bg-red-50 text-red-700' },
  Mercury: { bg: 'bg-emerald-600', text: 'text-white', chip: 'bg-emerald-50 text-emerald-700' },
  Jupiter: { bg: 'bg-amber-500', text: 'text-white', chip: 'bg-amber-50 text-amber-700' },
  Venus: { bg: 'bg-pink-500', text: 'text-white', chip: 'bg-pink-50 text-pink-700' },
  Saturn: { bg: 'bg-indigo-700', text: 'text-white', chip: 'bg-indigo-50 text-indigo-700' },
  Rahu: { bg: 'bg-stone-600', text: 'text-white', chip: 'bg-stone-100 text-stone-700' },
  Ketu: { bg: 'bg-slate-500', text: 'text-white', chip: 'bg-slate-100 text-slate-700' },
  // Not a graha -- Arabic Part of Fortune, a computed chart point. Teal is
  // deliberately outside the 9-planet palette so it never reads as a graha.
  Fortuna: { bg: 'bg-teal-600', text: 'text-white', chip: 'bg-teal-50 text-teal-700' },
};

const DEFAULT_COLOR: PlanetColor = { bg: 'bg-gray-500', text: 'text-white', chip: 'bg-gray-100 text-gray-700' };

const PLANET_SHORT_NAMES: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Fortuna: 'Fo',
};

// The `planet` field on a chart document is free-text (no schema enum --
// years of manual data entry across many charts), so a stray case difference
// or trailing space ("saturn ", "RAHU") silently misses every exact-string
// lookup below and renders as a blank, uncolored badge with no visible
// error -- confirmed this is NOT a data problem on every chart (a freshly
// computed chart's 9 names always match exactly), only on older
// manually-entered ones. Canonicalizing here fixes the display for all of
// them at once instead of hunting down and re-typing each bad record.
function canonicalPlanetName(name: string): string {
  const trimmed = (name || '').trim();
  const match = Object.keys(PLANET_SHORT_NAMES).find((n) => n.toLowerCase() === trimmed.toLowerCase());
  return match || trimmed;
}

export function planetColorOf(planetName: string): PlanetColor {
  return PLANET_COLORS[canonicalPlanetName(planetName)] || DEFAULT_COLOR;
}

export function planetShortNameOf(planetName: string): string {
  const canonical = canonicalPlanetName(planetName);
  return PLANET_SHORT_NAMES[canonical] || planetName;
}

// Standard Navagraha order (Sun through Ketu). Chart documents don't
// guarantee this order in their stored `planets` array (depends on how the
// data was entered/computed), so tables that list all 9 planets sort by this
// fixed sequence rather than array order -- otherwise a planet can render out
// of its expected row position and read as "missing" from the table.
export const PLANET_DISPLAY_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

export function sortByPlanetOrder<T extends { planet: string }>(rows: T[]): T[] {
  const rank = (name: string) => {
    const i = PLANET_DISPLAY_ORDER.indexOf(canonicalPlanetName(name));
    return i === -1 ? PLANET_DISPLAY_ORDER.length : i;
  };
  return [...rows].sort((a, b) => rank(a.planet) - rank(b.planet));
}

// House-number badges use one consistent accent (distinct from planet
// colors) so numbers and planets are never visually confused.
export const HOUSE_BADGE = 'bg-indigo-600 text-white';
