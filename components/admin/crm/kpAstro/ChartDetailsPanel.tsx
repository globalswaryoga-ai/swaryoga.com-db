'use client';

import { useState } from 'react';
import HousesPlanetsTable from './HousesPlanetsTable';
import PlanetaryAspectsTable from './PlanetaryAspectsTable';
import SignificationStrengthTable from './SignificationStrengthTable';
import { useKpLanguage } from './KpLanguageContext';
import { t } from '@/lib/kpAstro/uiLabels';
import type { SignificatorHouse, SignificatorPlanet, FortunaPoint } from '@/lib/kpAstro/significators';

type PlanetRow = SignificatorPlanet & { retrograde?: boolean; combust?: boolean };

export default function ChartDetailsPanel({ houses, planets, fortuna }: { houses: SignificatorHouse[]; planets: PlanetRow[]; fortuna?: FortunaPoint }) {
  const { lang } = useKpLanguage();
  const [view, setView] = useState<'houses' | 'planets'>('houses');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <h3 className="text-sm font-semibold text-gray-900">{t('housesAndPlanets', lang)}</h3>
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
        <HousesPlanetsTable houses={houses} planets={planets} view={view} fortuna={fortuna} />
      </div>
      <PlanetaryAspectsTable planets={planets} />
      <SignificationStrengthTable houses={houses} planets={planets} />
    </div>
  );
}
