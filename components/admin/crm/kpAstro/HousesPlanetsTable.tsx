'use client';

// Read-only 12-Bhav reference table: house lords, occupying planets, and the
// cuspal Sub Lord's own significations — computed live from the chart's
// houses/planets. Shared between the chart detail page and the Astrologer
// Workspace, where it's the quick reference an astrologer checks while
// filling in the BhavEditor's ABCD significators by hand.

import { cuspSubLordSignification, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';

export default function HousesPlanetsTable({ houses, planets }: { houses: SignificatorHouse[]; planets: SignificatorPlanet[] }) {
  if (!houses.length && !planets.length) {
    return <p className="text-sm text-gray-400">No house/planet data yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-400">
            <th className="p-1">House</th><th className="p-1">Sign</th><th className="p-1">Sign Lord</th>
            <th className="p-1">Star</th><th className="p-1">Star Lord</th><th className="p-1">Sub Lord</th>
            <th className="p-1">Occupying Planets</th><th className="p-1">Sub Lord Signifies (Deposition / Ownership)</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((houseNum) => {
            const h = houses.find((x) => x.house === houseNum);
            const occupants = planets.filter((p) => p.house === houseNum).map((p) => p.planet);
            const cusp = cuspSubLordSignification(houses, planets, houseNum);
            return (
              <tr key={houseNum} className="border-t border-gray-100">
                <td className="p-1 font-semibold text-gray-700">{houseNum}</td>
                <td className="p-1">{h?.sign || '—'}</td>
                <td className="p-1">{h?.signLord || '—'}</td>
                <td className="p-1">{h?.star || '—'}</td>
                <td className="p-1">{h?.starLord || '—'}</td>
                <td className="p-1 font-medium text-indigo-700">{h?.subLord || '—'}</td>
                <td className="p-1">{occupants.length ? occupants.join(', ') : '—'}</td>
                <td className="p-1 text-gray-500">
                  {cusp.subLord ? `Dep: ${cusp.byDeposition.join(', ') || '—'} · Own: ${cusp.byOwnership.join(', ') || '—'}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
