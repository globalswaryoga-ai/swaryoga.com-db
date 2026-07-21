'use client';

// Western-style degree-based Planetary Aspects grid (conjunction through
// opposition) — a different lens than the Parashari drishti already shown
// in the Houses view, matching the standard KP software reference layout.

import { computePlanetaryAspects, ASPECT_TYPES, ASPECT_ANGLES, type AspectType } from '@/lib/kpAstro/planetaryAspects';
import { naturalNature, type PlanetNature } from '@/lib/kpAstro/planetNature';
import type { SignificatorPlanet } from '@/lib/kpAstro/significators';
import { t, type UiLang } from '@/lib/kpAstro/uiLabels';
import { useKpLanguage } from './KpLanguageContext';

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

function shortList(names: string[]): string {
  return names.length ? names.map(planetShortName).join(', ') : '';
}

const ASPECT_SYMBOL: Record<AspectType, string> = {
  Conjunction: '☌', 'Semi-sextile': '⏚', 'Semi-square': '∠',
  Sextile: '✱', Square: '□', Trine: '△',
  Sesquisquare: '⏛', Quincunx: '⚿', Opposition: '☍',
};

export default function PlanetaryAspectsTable({ planets }: { planets: SignificatorPlanet[] }) {
  const { lang } = useKpLanguage();
  if (!planets.length) {
    return <p className="text-sm text-slate-400">{t('noPlanetData', lang)}</p>;
  }

  const rows = computePlanetaryAspects(planets);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-950 to-black shadow-sm">
      <div className="border-b border-zinc-800 bg-black px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{t('planetaryAspects', lang)}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="sticky left-0 z-20 min-w-[80px] border-b border-zinc-800 bg-zinc-950 p-3">{t('nature', lang)}</th>
              <th className="sticky left-[80px] z-20 min-w-[70px] border-b border-zinc-800 bg-zinc-950 p-3">{t('planet', lang)}</th>
              {ASPECT_TYPES.map((type) => (
                <th key={type} className="min-w-[110px] border-b border-zinc-800 bg-zinc-950 p-3">
                  <span className="mr-1 text-yellow-300">{ASPECT_SYMBOL[type]}</span>
                  {t(ASPECT_LABEL_KEY[type], lang)}
                  <div className="text-[10px] font-normal normal-case text-zinc-500">({ASPECT_ANGLES[type]}°)</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const planet = planets.find((p) => p.planet === row.planet)!;
              const nature = naturalNature(planet, planets);
              return (
                <tr key={row.planet} className="group align-top">
                  <td className={`sticky left-0 z-10 border-b border-zinc-800 bg-black p-3 font-semibold group-hover:bg-zinc-900 ${nature === 'Benefic' ? 'text-emerald-400' : nature === 'Malefic' ? 'text-red-500' : 'text-zinc-400'}`}>
                    {natureLabel(nature, lang)}
                  </td>
                  <td className="sticky left-[80px] z-10 border-b border-zinc-800 bg-black p-3 font-semibold text-yellow-300 group-hover:bg-zinc-900">
                    {planetShortName(row.planet)}
                  </td>
                  {ASPECT_TYPES.map((type) => (
                    <td key={type} className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">
                      {shortList(row.aspects[type]) || <span className="text-zinc-600">-</span>}
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
