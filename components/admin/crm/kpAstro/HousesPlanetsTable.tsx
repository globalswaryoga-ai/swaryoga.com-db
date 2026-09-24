'use client';

// Read-only 12-Bhav / 9-Graha reference table with a per-house view and a
// per-planet view — computed live from the chart's houses/planets. The
// Houses/Planets toggle itself lives in the parent (ChartDetailsPanel),
// which also decides what to render alongside it; this component just
// renders whichever view it's told to.

import { cuspSubLordSignification, housesOwnedBy, starLordOf, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';
import { computeDrishtiOnHouses } from '@/lib/kpAstro/aspectAnalysis';
import { naturalNature, type PlanetNature } from '@/lib/kpAstro/planetNature';
import { SIGN_LORDS } from '@/lib/kpAstro';
import { t } from '@/lib/kpAstro/uiLabels';
import { useKpLanguage } from './KpLanguageContext';
import { planetColorOf, planetShortNameOf, sortByPlanetOrder, HOUSE_BADGE } from '@/lib/kpAstro/planetColors';
import type { FortunaPoint } from '@/lib/kpAstro/significators';

function natureLabel(nature: PlanetNature, lang: 'en' | 'hi'): string {
  return nature === 'Benefic' ? t('benefic', lang) : nature === 'Malefic' ? t('malefic', lang) : t('neutral', lang);
}

function HouseBadge({ houseNum }: { houseNum: number }) {
  return <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${HOUSE_BADGE}`}>{houseNum}</span>;
}

function PlanetBadge({ name }: { name: string }) {
  const color = planetColorOf(name);
  return <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${color.bg} ${color.text}`}>{planetShortNameOf(name)}</span>;
}

function planetChips(names: string[]) {
  if (!names.length) return <span className="text-gray-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => {
        const color = planetColorOf(name);
        return (
          <span key={name} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${color.chip}`}>
            {planetShortNameOf(name)}
          </span>
        );
      })}
    </div>
  );
}

function houseList(values: number[]): string {
  return values.length ? values.join(', ') : '-';
}

function HousesView({ houses, planets, fortuna }: { houses: SignificatorHouse[]; planets: SignificatorPlanet[]; fortuna?: FortunaPoint }) {
  const { lang } = useKpLanguage();
  const drishtiHits = computeDrishtiOnHouses(planets);

  return (
    <table className="w-full border-separate border-spacing-0 text-xs">
      <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500">
        <tr>
          <th className="sticky left-0 z-20 min-w-[70px] border-b border-gray-200 bg-gray-50 p-3">{t('house', lang)}</th>
          <th className="min-w-[105px] border-b border-gray-200 bg-gray-50 p-3">{t('sign', lang)}</th>
          <th className="min-w-[120px] border-b border-gray-200 bg-gray-50 p-3">{t('position', lang)}</th>
          <th className="min-w-[150px] border-b border-gray-200 bg-gray-50 p-3">{t('star', lang)}</th>
          <th className="min-w-[120px] border-b border-gray-200 bg-gray-50 p-3">{t('signLord', lang)}</th>
          <th className="min-w-[120px] border-b border-gray-200 bg-gray-50 p-3">{t('starLord', lang)}</th>
          <th className="min-w-[120px] border-b border-gray-200 bg-gray-50 p-3">{t('subLord', lang)}</th>
          <th className="min-w-[160px] border-b border-gray-200 bg-gray-50 p-3">{t('occupants', lang)}</th>
          <th className="min-w-[170px] border-b border-gray-200 bg-gray-50 p-3">{t('drishti', lang)}</th>
          <th className="min-w-[210px] border-b border-gray-200 bg-gray-50 p-3">{t('subLordSignifies', lang)}</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((houseNum) => {
          const h = houses.find((x) => x.house === houseNum);
          const occupants = planets.filter((p) => p.house === houseNum).map((p) => p.planet);
          if (fortuna?.house === houseNum) occupants.push('Fortuna');
          const aspectedBy = drishtiHits.filter((d) => d.toHouse === houseNum).map((d) => d.planet);
          const cusp = cuspSubLordSignification(houses, planets, houseNum);
          return (
            <tr key={houseNum} className="group align-top hover:bg-gray-50">
              <td className="sticky left-0 z-10 border-b border-gray-100 bg-white p-3 group-hover:bg-gray-50">
                <HouseBadge houseNum={houseNum} />
              </td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{h?.sign || '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{h?.degree || '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{h?.star || '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{h?.signLord || '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{h?.starLord || '-'}</td>
              <td className="border-b border-gray-100 p-3 font-semibold text-indigo-700">{h?.subLord || '-'}</td>
              <td className="border-b border-gray-100 p-3">{planetChips(occupants)}</td>
              <td className="border-b border-gray-100 p-3">{planetChips(aspectedBy)}</td>
              <td className="border-b border-gray-100 p-3 text-gray-600">
                {cusp.subLord ? `${t('dep', lang)}: ${cusp.byDeposition.join(', ') || '-'} | ${t('own', lang)}: ${cusp.byOwnership.join(', ') || '-'}` : '-'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PlanetsView({ houses, planets, fortuna }: { houses: SignificatorHouse[]; planets: SignificatorPlanet[]; fortuna?: FortunaPoint }) {
  const { lang } = useKpLanguage();
  const orderedPlanets = sortByPlanetOrder(planets);
  return (
    <table className="w-full border-separate border-spacing-0 text-xs">
      <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500">
        <tr>
          <th className="sticky left-0 z-20 min-w-[70px] border-b border-gray-200 bg-gray-50 p-3">{t('planet', lang)}</th>
          <th className="min-w-[100px] border-b border-gray-200 bg-gray-50 p-3">{t('sign', lang)}</th>
          <th className="min-w-[120px] border-b border-gray-200 bg-gray-50 p-3">{t('position', lang)}</th>
          <th className="min-w-[150px] border-b border-gray-200 bg-gray-50 p-3">{t('star', lang)}</th>
          <th className="min-w-[110px] border-b border-gray-200 bg-gray-50 p-3">{t('signLord', lang)}</th>
          <th className="min-w-[110px] border-b border-gray-200 bg-gray-50 p-3">{t('starLord', lang)}</th>
          <th className="min-w-[110px] border-b border-gray-200 bg-gray-50 p-3">{t('subLord', lang)}</th>
          <th className="min-w-[100px] border-b border-gray-200 bg-gray-50 p-3">{t('nature', lang)}</th>
          <th className="min-w-[100px] border-b border-gray-200 bg-gray-50 p-3">{t('occupies', lang)}</th>
          <th className="min-w-[100px] border-b border-gray-200 bg-gray-50 p-3">{t('owns', lang)}</th>
        </tr>
      </thead>
      <tbody>
        {orderedPlanets.map((p) => {
          const signLord = p.sign ? SIGN_LORDS[p.sign] : undefined;
          const starLord = starLordOf(p);
          const owns = housesOwnedBy(houses, p.planet);
          const nature = naturalNature(p, planets);
          return (
            <tr key={p.planet} className="group align-top hover:bg-gray-50">
              <td className="sticky left-0 z-10 border-b border-gray-100 bg-white p-3 group-hover:bg-gray-50">
                <PlanetBadge name={p.planet} />
              </td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{p.sign || '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{p.degree || '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{p.star || '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{signLord || '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{starLord || '-'}</td>
              <td className="border-b border-gray-100 p-3 font-semibold text-indigo-700">{p.subLord || '-'}</td>
              <td className={`border-b border-gray-100 p-3 font-semibold ${nature === 'Benefic' ? 'text-emerald-600' : nature === 'Malefic' ? 'text-red-600' : 'text-gray-500'}`}>
                {natureLabel(nature, lang)}
              </td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{p.house ?? '-'}</td>
              <td className="border-b border-gray-100 p-3 text-gray-700">{houseList(owns)}</td>
            </tr>
          );
        })}
        {fortuna && (
          <tr key="Fortuna" className="group align-top bg-teal-50/40 hover:bg-teal-50">
            <td className="sticky left-0 z-10 border-b border-gray-100 bg-teal-50/40 p-3 group-hover:bg-teal-50">
              <PlanetBadge name="Fortuna" />
            </td>
            <td className="border-b border-gray-100 p-3 text-gray-700">{fortuna.sign || '-'}</td>
            <td className="border-b border-gray-100 p-3 text-gray-700">{fortuna.degree || '-'}</td>
            <td className="border-b border-gray-100 p-3 text-gray-700">{fortuna.star || '-'}</td>
            <td className="border-b border-gray-100 p-3 text-gray-700">{fortuna.signLord || '-'}</td>
            <td className="border-b border-gray-100 p-3 text-gray-700">{fortuna.starLord || '-'}</td>
            <td className="border-b border-gray-100 p-3 font-semibold text-indigo-700">{fortuna.subLord || '-'}</td>
            <td className="border-b border-gray-100 p-3 text-gray-400">-</td>
            <td className="border-b border-gray-100 p-3 text-gray-700">{fortuna.house ?? '-'}</td>
            <td className="border-b border-gray-100 p-3 text-gray-400">-</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function HousesPlanetsTable({
  houses,
  planets,
  view = 'houses',
  fortuna,
}: {
  houses: SignificatorHouse[];
  planets: SignificatorPlanet[];
  view?: 'houses' | 'planets';
  fortuna?: FortunaPoint;
}) {
  const { lang } = useKpLanguage();
  if (!houses.length && !planets.length) {
    return <p className="text-sm text-gray-400">{t('noHouseData', lang)}</p>;
  }

  return (
    <div className="overflow-x-auto">
      {view === 'houses' ? <HousesView houses={houses} planets={planets} fortuna={fortuna} /> : <PlanetsView houses={houses} planets={planets} fortuna={fortuna} />}
    </div>
  );
}
