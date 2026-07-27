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
import { planetColorOf, planetShortNameOf, sortByPlanetOrder } from '@/lib/kpAstro/planetColors';

function houseList(values: number[]): string {
  return values.length ? values.join(', ') : '-';
}

function DepOwnCell({ value }: { value: DepOwn }) {
  return (
    <>
      <td className="border-b border-gray-100 p-3 text-gray-700">{houseList(value.dep)}</td>
      <td className="border-b border-gray-100 p-3 text-gray-700">{houseList(value.own)}</td>
    </>
  );
}

export default function SignificationStrengthTable({ houses, planets }: { houses: SignificatorHouse[]; planets: SignificatorPlanet[] }) {
  const { lang } = useKpLanguage();
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);

  if (!planets.length) {
    return <p className="text-sm text-gray-400">{t('noPlanetData', lang)}</p>;
  }

  const rows = sortByPlanetOrder(computeSignificationStrength(houses, planets));
  const visibleRows = selectedHouse ? rows.filter((r) => rowSignifiesHouse(r, selectedHouse)) : rows;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{t('significationStrengthTitle', lang)}</h3>
        <select
          value={selectedHouse ?? ''}
          onChange={(e) => setSelectedHouse(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
        >
          <option value="">{t('selectHouse', lang)}</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{h}{h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th'} House</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 min-w-[70px] border-b border-gray-200 bg-gray-50 p-3 align-bottom">{t('planet', lang)}</th>
              <th colSpan={2} className="border-b border-gray-200 bg-gray-50 p-3 text-center">{t('starLordCol', lang)}</th>
              <th colSpan={2} className="border-b border-gray-200 bg-gray-50 p-3 text-center">{t('subLordCol', lang)}</th>
              <th colSpan={2} className="border-b border-gray-200 bg-gray-50 p-3 text-center">{t('conjunctionLords', lang)}</th>
              <th colSpan={2} className="border-b border-gray-200 bg-gray-50 p-3 text-center">{t('oppositionLords', lang)}</th>
              <th colSpan={2} className="border-b border-gray-200 bg-gray-50 p-3 text-center">{t('self', lang)}</th>
            </tr>
            <tr>
              {Array.from({ length: 5 }).map((_, i) => (
                <>
                  <th key={`dep-${i}`} className="min-w-[70px] border-b border-gray-200 bg-gray-50 p-2 text-center">{t('dep', lang)}</th>
                  <th key={`own-${i}`} className="min-w-[70px] border-b border-gray-200 bg-gray-50 p-2 text-center">{t('own', lang)}</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const color = planetColorOf(row.planet);
              return (
                <tr key={row.planet} className="group align-top hover:bg-gray-50">
                  <td className="sticky left-0 z-10 border-b border-gray-100 bg-white p-3 group-hover:bg-gray-50">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${color.bg} ${color.text}`}>
                      {planetShortNameOf(row.planet)}
                    </span>
                  </td>
                  <DepOwnCell value={row.starLordDepOwn} />
                  <DepOwnCell value={row.subLordDepOwn} />
                  <DepOwnCell value={row.conjunctionDepOwn} />
                  <DepOwnCell value={row.oppositionDepOwn} />
                  <DepOwnCell value={row.selfDepOwn} />
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-4 text-center text-gray-400">{t('noSignificatorHouse', lang)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
