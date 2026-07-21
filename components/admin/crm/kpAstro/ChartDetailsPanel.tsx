'use client';

import { useState } from 'react';
import HousesPlanetsTable from './HousesPlanetsTable';
import PlanetaryAspectsTable from './PlanetaryAspectsTable';
import SignificationStrengthTable from './SignificationStrengthTable';
import { useKpLanguage } from './KpLanguageContext';
import { t } from '@/lib/kpAstro/uiLabels';
import type { SignificatorHouse, SignificatorPlanet } from '@/lib/kpAstro/significators';

type PlanetRow = SignificatorPlanet & { retrograde?: boolean; combust?: boolean };

export default function ChartDetailsPanel({ houses, planets }: { houses: SignificatorHouse[]; planets: PlanetRow[] }) {
  const { lang } = useKpLanguage();
  const [view, setView] = useState<'houses' | 'planets'>('houses');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-700 bg-black p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <h3 className="text-sm font-semibold text-white">{t('housesAndPlanets', lang)}</h3>
          <div className="inline-flex rounded-xl border border-zinc-700 bg-zinc-950 p-1">
            {(['houses', 'planets'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${view === mode ? 'bg-yellow-400 text-black shadow-sm' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'}`}
              >
                {mode === 'houses' ? t('houses', lang) : t('planets', lang)}
              </button>
            ))}
          </div>
        </div>
        <HousesPlanetsTable houses={houses} planets={planets} view={view} />
      </div>
      <PlanetaryAspectsTable planets={planets} />
      <SignificationStrengthTable houses={houses} planets={planets} />
    </div>
  );
}
