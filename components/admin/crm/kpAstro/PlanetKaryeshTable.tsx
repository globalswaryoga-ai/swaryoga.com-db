'use client';

import { computeFourStepSignificators, housesOwnedBy, starLordOf, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';

type PlanetRow = SignificatorPlanet & { retrograde?: boolean; combust?: boolean };

function houseList(values: number[]): string {
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

function planetNature(houses: SignificatorHouse[], planetName: string): 'Benefic' | 'Malefic' {
  if (planetName === 'Rahu') return 'Benefic';
  if (planetName === 'Ketu') return 'Malefic';

  const owned = housesOwnedBy(houses, planetName);
  if (!owned.length) {
    return ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(planetName) ? 'Benefic' : 'Malefic';
  }

  const strongBeneficHouses = new Set([1, 2, 4, 5, 7, 9, 10]);
  return owned.some((house) => strongBeneficHouses.has(house)) ? 'Benefic' : 'Malefic';
}

export default function PlanetKaryeshTable({ houses, planets }: { houses: SignificatorHouse[]; planets: PlanetRow[] }) {
  const fourStep = computeFourStepSignificators(houses, planets);

  if (!planets.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
        No planet data found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">ABCD Significators - Planets</h3>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">{planets.length} planets</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="text-left text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 min-w-[120px] border-b border-slate-100 bg-slate-50/95 p-3">Planet</th>
              <th className="min-w-[90px] border-b border-slate-100 bg-slate-50/80 p-3">House</th>
              <th className="min-w-[115px] border-b border-slate-100 bg-slate-50/80 p-3">Sign</th>
              <th className="min-w-[120px] border-b border-slate-100 bg-slate-50/80 p-3">Degree</th>
              <th className="min-w-[145px] border-b border-slate-100 bg-slate-50/80 p-3">Star</th>
              <th className="min-w-[120px] border-b border-slate-100 bg-slate-50/80 p-3">Star Lord</th>
              <th className="min-w-[120px] border-b border-slate-100 bg-slate-50/80 p-3">Sub Lord</th>
              <th className="min-w-[110px] border-b border-slate-100 bg-slate-50/80 p-3">Nature</th>
              <th className="min-w-[90px] border-b border-slate-100 bg-slate-50/80 p-3">A</th>
              <th className="min-w-[90px] border-b border-slate-100 bg-slate-50/80 p-3">B</th>
              <th className="min-w-[90px] border-b border-slate-100 bg-slate-50/80 p-3">C</th>
              <th className="min-w-[90px] border-b border-slate-100 bg-slate-50/80 p-3">D</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((planet) => {
              const sig = fourStep.find((item) => item.planet === planet.planet);
              const starLord = starLordOf(planet);
              const nature = planetNature(houses, planet.planet);

              return (
                <tr key={planet.planet} className="group align-top">
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white/95 p-3 group-hover:bg-indigo-50/80">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                        {planetShortName(planet.planet)}
                      </span>
                      {planet.retrograde && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">R</span>}
                      {planet.combust && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-600">U</span>}
                    </div>
                  </td>
                  <td className="border-b border-slate-100 p-3 text-slate-700 group-hover:bg-indigo-50/30">{planet.house || '-'}</td>
                  <td className="border-b border-slate-100 p-3 text-slate-700 group-hover:bg-indigo-50/30">{planet.sign || '-'}</td>
                  <td className="border-b border-slate-100 p-3 text-slate-700 group-hover:bg-indigo-50/30">{planet.degree || '-'}</td>
                  <td className="border-b border-slate-100 p-3 text-slate-700 group-hover:bg-indigo-50/30">{planet.star || '-'}</td>
                  <td className="border-b border-slate-100 p-3 text-indigo-700 group-hover:bg-indigo-50/30">{starLord || '-'}</td>
                  <td className="border-b border-slate-100 p-3 text-slate-700 group-hover:bg-indigo-50/30">{planet.subLord || '-'}</td>
                  <td className={`border-b border-slate-100 p-3 font-medium group-hover:bg-indigo-50/30 ${nature === 'Benefic' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {nature}
                  </td>
                  <td className="border-b border-slate-100 p-3 font-medium text-slate-800 group-hover:bg-indigo-50/30">{sig ? houseList(sig.A) : '-'}</td>
                  <td className="border-b border-slate-100 p-3 font-medium text-slate-800 group-hover:bg-indigo-50/30">{sig ? houseList(sig.B) : '-'}</td>
                  <td className="border-b border-slate-100 p-3 font-medium text-slate-800 group-hover:bg-indigo-50/30">{sig ? houseList(sig.C) : '-'}</td>
                  <td className="border-b border-slate-100 p-3 font-medium text-slate-800 group-hover:bg-indigo-50/30">{sig ? houseList(sig.D) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
