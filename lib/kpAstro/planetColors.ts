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
};

const DEFAULT_COLOR: PlanetColor = { bg: 'bg-gray-500', text: 'text-white', chip: 'bg-gray-100 text-gray-700' };

export function planetColorOf(planetName: string): PlanetColor {
  return PLANET_COLORS[planetName] || DEFAULT_COLOR;
}

// House-number badges use one consistent accent (distinct from planet
// colors) so numbers and planets are never visually confused.
export const HOUSE_BADGE = 'bg-indigo-600 text-white';
