'use client';

import { useState } from 'react';
import HousesPlanetsTable from './HousesPlanetsTable';
import PlanetKaryeshTable from './PlanetKaryeshTable';
import type { SignificatorHouse, SignificatorPlanet } from '@/lib/kpAstro/significators';

type PlanetRow = SignificatorPlanet & { retrograde?: boolean; combust?: boolean };

export default function ChartDetailsPanel({ houses, planets }: { houses: SignificatorHouse[]; planets: PlanetRow[] }) {
  const [view, setView] = useState<'houses' | 'planets'>('houses');

  return (
    <div className="rounded-2xl border border-zinc-700 bg-black p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <h3 className="text-sm font-semibold text-white">Houses &amp; Planets Details</h3>
        <div className="inline-flex rounded-xl border border-zinc-700 bg-zinc-950 p-1">
          {(['houses', 'planets'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${view === mode ? 'bg-yellow-400 text-black shadow-sm' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'}`}
            >
              {mode === 'houses' ? 'Houses' : 'Planets'}
            </button>
          ))}
        </div>
      </div>
      {view === 'houses' ? (
        <HousesPlanetsTable houses={houses} planets={planets} />
      ) : (
        <PlanetKaryeshTable houses={houses} planets={planets} />
      )}
    </div>
  );
}
