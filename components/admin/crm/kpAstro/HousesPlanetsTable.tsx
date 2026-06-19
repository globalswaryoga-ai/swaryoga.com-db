'use client';

// Read-only 12-Bhav reference table: house lords, occupying planets, and the
// cuspal Sub Lord's own significations — computed live from the chart's
// houses/planets. Shared between the chart detail page and the Astrologer
// Workspace, where it's the quick reference an astrologer checks while
// filling in the BhavEditor's ABCD significators by hand.

import { cuspSubLordSignification, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';
import { computeDrishtiOnHouses } from '@/lib/kpAstro/aspectAnalysis';

export default function HousesPlanetsTable({ houses, planets }: { houses: SignificatorHouse[]; planets: SignificatorPlanet[] }) {
  if (!houses.length && !planets.length) {
    return <p className="text-sm text-slate-400">No house data found.</p>;
  }

  const drishtiHits = computeDrishtiOnHouses(planets);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-950 to-black shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="sticky left-0 z-20 min-w-[90px] border-b border-zinc-800 bg-zinc-950 p-3">House</th>
              <th className="min-w-[105px] border-b border-zinc-800 bg-zinc-950 p-3">Sign</th>
              <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">Position</th>
              <th className="min-w-[150px] border-b border-zinc-800 bg-zinc-950 p-3">Star</th>
              <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">Sign Lord</th>
              <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">Star Lord</th>
              <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">Sub Lord</th>
              <th className="min-w-[160px] border-b border-zinc-800 bg-zinc-950 p-3">Occupants</th>
              <th className="min-w-[170px] border-b border-zinc-800 bg-zinc-950 p-3">Drishti</th>
              <th className="min-w-[210px] border-b border-zinc-800 bg-zinc-950 p-3">Sub Lord Signifies</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((houseNum) => {
            const h = houses.find((x) => x.house === houseNum);
            const occupants = planets.filter((p) => p.house === houseNum).map((p) => p.planet);
            const aspectedBy = drishtiHits.filter((d) => d.toHouse === houseNum).map((d) => d.planet);
            const cusp = cuspSubLordSignification(houses, planets, houseNum);
            return (
              <tr key={houseNum} className="group align-top">
                <td className="sticky left-0 z-10 border-b border-zinc-800 bg-black p-3 group-hover:bg-zinc-900">
                  <span className="inline-flex rounded-full bg-yellow-400 px-2.5 py-1 text-[11px] font-bold text-black">{houseNum}</span>
                </td>
                <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{h?.sign || '-'}</td>
                <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{h?.degree || '-'}</td>
                <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{h?.star || '-'}</td>
                <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{h?.signLord || '-'}</td>
                <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{h?.starLord || '-'}</td>
                <td className="border-b border-zinc-800 p-3 font-semibold text-yellow-300 group-hover:bg-zinc-900">{h?.subLord || '-'}</td>
                <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{occupants.length ? occupants.join(', ') : '-'}</td>
                <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{aspectedBy.length ? aspectedBy.join(', ') : '-'}</td>
                <td className="border-b border-zinc-800 p-3 text-zinc-300 group-hover:bg-zinc-900">
                  {cusp.subLord ? `Dep: ${cusp.byDeposition.join(', ') || '-'} | Own: ${cusp.byOwnership.join(', ') || '-'}` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}
