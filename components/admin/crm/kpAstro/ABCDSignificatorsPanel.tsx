'use client';

import { useState } from 'react';
import type { BhavAnalysisRow } from './BhavEditor';
import { computeFourStepSignificators, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';
import { t } from '@/lib/kpAstro/uiLabels';
import { useKpLanguage } from './KpLanguageContext';
import { planetColorOf, HOUSE_BADGE } from '@/lib/kpAstro/planetColors';

type PlanetRow = SignificatorPlanet & { retrograde?: boolean; combust?: boolean };

function houseList(values: number[]): string {
  return values.length ? values.join(', ') : '-';
}

function textList(values: string[]): string {
  return values.length ? values.join(', ') : '-';
}

function planetShortName(name: string): string {
  const map: Record<string, string> = {
    Sun: 'Su',
    Moon: 'Mo',
    Mars: 'Ma',
    Mercury: 'Me',
    Jupiter: 'Ju',
    Venus: 'Ve',
    Saturn: 'Sa',
    Rahu: 'Ra',
    Ketu: 'Ke',
  };
  return map[name] || name;
}

export default function ABCDSignificatorsPanel({
  houses,
  planets,
  bhavRows,
}: {
  houses: SignificatorHouse[];
  planets: PlanetRow[];
  bhavRows: BhavAnalysisRow[];
}) {
  const { lang } = useKpLanguage();
  const [view, setView] = useState<'houses' | 'planets'>('planets');
  const fourStep = computeFourStepSignificators(houses, planets);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <h3 className="text-sm font-semibold text-gray-900">{t('abcdSignificators', lang)}</h3>
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          {(['houses', 'planets'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${view === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              {mode === 'houses' ? t('houses', lang) : t('planets', lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="sticky left-0 z-20 min-w-[80px] border-b border-gray-200 bg-gray-50 p-3">{view === 'houses' ? t('house', lang) : t('planet', lang)}</th>
                <th className="min-w-[190px] border-b border-gray-200 bg-gray-50 p-3">A</th>
                <th className="min-w-[190px] border-b border-gray-200 bg-gray-50 p-3">B</th>
                <th className="min-w-[190px] border-b border-gray-200 bg-gray-50 p-3">C</th>
                <th className="min-w-[190px] border-b border-gray-200 bg-gray-50 p-3">D</th>
              </tr>
            </thead>
            <tbody>
              {view === 'houses'
                ? bhavRows.map((row) => (
                    <tr key={row.house} className="group align-top hover:bg-gray-50">
                      <td className="sticky left-0 z-10 border-b border-gray-100 bg-white p-3 group-hover:bg-gray-50">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${HOUSE_BADGE}`}>{row.house}</span>
                      </td>
                      <td className="border-b border-gray-100 p-3 text-gray-700">{textList(row.significatorsA)}</td>
                      <td className="border-b border-gray-100 p-3 text-gray-700">{textList(row.significatorsB)}</td>
                      <td className="border-b border-gray-100 p-3 text-gray-700">{textList(row.significatorsC)}</td>
                      <td className="border-b border-gray-100 p-3 text-gray-700">{textList(row.significatorsD)}</td>
                    </tr>
                  ))
                : planets.map((planet) => {
                    const sig = fourStep.find((item) => item.planet === planet.planet);
                    const color = planetColorOf(planet.planet);
                    return (
                      <tr key={planet.planet} className="group align-top hover:bg-gray-50">
                        <td className="sticky left-0 z-10 border-b border-gray-100 bg-white p-3 group-hover:bg-gray-50">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${color.bg} ${color.text}`}>{planetShortName(planet.planet)}</span>
                        </td>
                        <td className="border-b border-gray-100 p-3 text-gray-700">{sig ? houseList(sig.A) : '-'}</td>
                        <td className="border-b border-gray-100 p-3 text-gray-700">{sig ? houseList(sig.B) : '-'}</td>
                        <td className="border-b border-gray-100 p-3 text-gray-700">{sig ? houseList(sig.C) : '-'}</td>
                        <td className="border-b border-gray-100 p-3 text-gray-700">{sig ? houseList(sig.D) : '-'}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
