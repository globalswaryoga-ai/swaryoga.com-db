'use client';

// Western-style degree-based Planetary Aspects grid (conjunction through
// opposition) — a different lens than the Parashari drishti already shown
// in the Houses view, matching the standard KP software reference layout.

import { computePlanetaryAspects, ASPECT_TYPES, ASPECT_ANGLES, type AspectType } from '@/lib/kpAstro/planetaryAspects';
import { naturalNature, type PlanetNature } from '@/lib/kpAstro/planetNature';
import type { SignificatorPlanet } from '@/lib/kpAstro/significators';
import { t, type UiLang } from '@/lib/kpAstro/uiLabels';
import { useKpLanguage } from './KpLanguageContext';
import { planetColorOf } from '@/lib/kpAstro/planetColors';

const ASPECT_LABEL_KEY: Record<AspectType, Parameters<typeof t>[0]> = {
  Conjunction: 'conjunction', 'Semi-sextile': 'semiSextile', 'Semi-square': 'semiSquare',
  Sextile: 'sextile', Square: 'square', Trine: 'trine',
  Sesquisquare: 'sesquisquare', Quincunx: 'quincunx', Opposition: 'opposition',
};

function natureLabel(nature: PlanetNature, lang: UiLang): string {
  return nature === 'Benefic' ? t('benefic', lang) : nature === 'Malefic' ? t('malefic', lang) : t('neutral', lang);
}

function planetShortName(name: string): string {
  const map: Record<string, string> = {
    Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
    Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
  };
  return map[name] || name;
}

function chipList(names: string[]) {
  if (!names.length) return <span className="text-gray-300">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => {
        const color = planetColorOf(name);
        return (
          <span key={name} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${color.chip}`}>
            {planetShortName(name)}
          </span>
        );
      })}
    </div>
  );
}

const ASPECT_SYMBOL: Record<AspectType, string> = {
  Conjunction: '☌', 'Semi-sextile': '⏚', 'Semi-square': '∠',
  Sextile: '✱', Square: '□', Trine: '△',
  Sesquisquare: '⏛', Quincunx: '⚿', Opposition: '☍',
};

export default function PlanetaryAspectsTable({ planets }: { planets: SignificatorPlanet[] }) {
  const { lang } = useKpLanguage();
  if (!planets.length) {
    return <p className="text-sm text-gray-400">{t('noPlanetData', lang)}</p>;
  }

  const rows = computePlanetaryAspects(planets);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{t('planetaryAspects', lang)}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="sticky left-0 z-20 min-w-[80px] border-b border-gray-200 bg-gray-50 p-3">{t('nature', lang)}</th>
              <th className="sticky left-[80px] z-20 min-w-[70px] border-b border-gray-200 bg-gray-50 p-3">{t('planet', lang)}</th>
              {ASPECT_TYPES.map((type) => (
                <th key={type} className="min-w-[110px] border-b border-gray-200 bg-gray-50 p-3">
                  <span className="mr-1 text-indigo-500">{ASPECT_SYMBOL[type]}</span>
                  {t(ASPECT_LABEL_KEY[type], lang)}
                  <div className="text-[10px] font-normal normal-case text-gray-400">({ASPECT_ANGLES[type]}°)</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const planet = planets.find((p) => p.planet === row.planet)!;
              const nature = naturalNature(planet, planets);
              const color = planetColorOf(row.planet);
              return (
                <tr key={row.planet} className="group align-top hover:bg-gray-50">
                  <td className={`sticky left-0 z-10 border-b border-gray-100 bg-white p-3 font-semibold group-hover:bg-gray-50 ${nature === 'Benefic' ? 'text-emerald-600' : nature === 'Malefic' ? 'text-red-600' : 'text-gray-500'}`}>
                    {natureLabel(nature, lang)}
                  </td>
                  <td className="sticky left-[80px] z-10 border-b border-gray-100 bg-white p-3 group-hover:bg-gray-50">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${color.bg} ${color.text}`}>
                      {planetShortName(row.planet)}
                    </span>
                  </td>
                  {ASPECT_TYPES.map((type) => (
                    <td key={type} className="border-b border-gray-100 p-3">
                      {chipList(row.aspects[type])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
