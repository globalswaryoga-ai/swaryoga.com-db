'use client';

// Planet Signification & Strength table, matching the standard KP software
// reference layout — Star Lord / Sub Lord / Conjunction Lords / Opposition
// Lords / Self, each split into Dep (deposited/occupied) and Own (owned)
// houses. The "Select House" filter narrows the rows down to only planets
// that signify the chosen house through any of those five channels — a
// quick significator finder for a specific Bhav.

import { useState } from 'react';
import { computeSignificationStrength, rowSignifiesHouse, type DepOwn } from '@/lib/kpAstro/significationStrength';
import type { SignificatorHouse, SignificatorPlanet } from '@/lib/kpAstro/significators';
import { t } from '@/lib/kpAstro/uiLabels';
import { useKpLanguage } from './KpLanguageContext';

function planetShortName(name: string): string {
  const map: Record<string, string> = {
    Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
    Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
  };
  return map[name] || name;
}

function houseList(values: number[]): string {
  return values.length ? values.join(', ') : '-';
}

function DepOwnCell({ value }: { value: DepOwn }) {
  return (
    <>
      <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{houseList(value.dep)}</td>
      <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{houseList(value.own)}</td>
    </>
  );
}

export default function SignificationStrengthTable({ houses, planets }: { houses: SignificatorHouse[]; planets: SignificatorPlanet[] }) {
  const { lang } = useKpLanguage();
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);

  if (!planets.length) {
    return <p className="text-sm text-slate-400">{t('noPlanetData', lang)}</p>;
  }

  const rows = computeSignificationStrength(houses, planets);
  const visibleRows = selectedHouse ? rows.filter((r) => rowSignifiesHouse(r, selectedHouse)) : rows;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-950 to-black shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-black px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{t('significationStrengthTitle', lang)}</h3>
        <select
          value={selectedHouse ?? ''}
          onChange={(e) => setSelectedHouse(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
        >
          <option value="">{t('selectHouse', lang)}</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{h}{h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th'} House</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 min-w-[70px] border-b border-zinc-800 bg-zinc-950 p-3 align-bottom">{t('planet', lang)}</th>
              <th colSpan={2} className="border-b border-zinc-800 bg-zinc-950 p-3 text-center">{t('starLordCol', lang)}</th>
              <th colSpan={2} className="border-b border-zinc-800 bg-zinc-950 p-3 text-center">{t('subLordCol', lang)}</th>
              <th colSpan={2} className="border-b border-zinc-800 bg-zinc-950 p-3 text-center">{t('conjunctionLords', lang)}</th>
              <th colSpan={2} className="border-b border-zinc-800 bg-zinc-950 p-3 text-center">{t('oppositionLords', lang)}</th>
              <th colSpan={2} className="border-b border-zinc-800 bg-zinc-950 p-3 text-center">{t('self', lang)}</th>
            </tr>
            <tr>
              {Array.from({ length: 5 }).map((_, i) => (
                <>
                  <th key={`dep-${i}`} className="min-w-[70px] border-b border-zinc-800 bg-zinc-950 p-2 text-center">{t('dep', lang)}</th>
                  <th key={`own-${i}`} className="min-w-[70px] border-b border-zinc-800 bg-zinc-950 p-2 text-center">{t('own', lang)}</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.planet} className="group align-top">
                <td className="sticky left-0 z-10 border-b border-zinc-800 bg-black p-3 font-semibold text-yellow-300 group-hover:bg-zinc-900">
                  {planetShortName(row.planet)}
                </td>
                <DepOwnCell value={row.starLordDepOwn} />
                <DepOwnCell value={row.subLordDepOwn} />
                <DepOwnCell value={row.conjunctionDepOwn} />
                <DepOwnCell value={row.oppositionDepOwn} />
                <DepOwnCell value={row.selfDepOwn} />
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-4 text-center text-zinc-500">{t('noSignificatorHouse', lang)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
