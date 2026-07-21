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

function natureLabel(nature: PlanetNature, lang: 'en' | 'hi'): string {
  return nature === 'Benefic' ? t('benefic', lang) : nature === 'Malefic' ? t('malefic', lang) : t('neutral', lang);
}

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

function HousesView({ houses, planets }: { houses: SignificatorHouse[]; planets: SignificatorPlanet[] }) {
  const { lang } = useKpLanguage();
  const drishtiHits = computeDrishtiOnHouses(planets);

  return (
    <table className="w-full border-separate border-spacing-0 text-xs">
      <thead className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
        <tr>
          <th className="sticky left-0 z-20 min-w-[90px] border-b border-zinc-800 bg-zinc-950 p-3">{t('house', lang)}</th>
          <th className="min-w-[105px] border-b border-zinc-800 bg-zinc-950 p-3">{t('sign', lang)}</th>
          <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">{t('position', lang)}</th>
          <th className="min-w-[150px] border-b border-zinc-800 bg-zinc-950 p-3">{t('star', lang)}</th>
          <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">{t('signLord', lang)}</th>
          <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">{t('starLord', lang)}</th>
          <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">{t('subLord', lang)}</th>
          <th className="min-w-[160px] border-b border-zinc-800 bg-zinc-950 p-3">{t('occupants', lang)}</th>
          <th className="min-w-[170px] border-b border-zinc-800 bg-zinc-950 p-3">{t('drishti', lang)}</th>
          <th className="min-w-[210px] border-b border-zinc-800 bg-zinc-950 p-3">{t('subLordSignifies', lang)}</th>
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
                {cusp.subLord ? `${t('dep', lang)}: ${cusp.byDeposition.join(', ') || '-'} | ${t('own', lang)}: ${cusp.byOwnership.join(', ') || '-'}` : '-'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PlanetsView({ houses, planets }: { houses: SignificatorHouse[]; planets: SignificatorPlanet[] }) {
  const { lang } = useKpLanguage();
  return (
    <table className="w-full border-separate border-spacing-0 text-xs">
      <thead className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
        <tr>
          <th className="sticky left-0 z-20 min-w-[90px] border-b border-zinc-800 bg-zinc-950 p-3">{t('planet', lang)}</th>
          <th className="min-w-[100px] border-b border-zinc-800 bg-zinc-950 p-3">{t('sign', lang)}</th>
          <th className="min-w-[120px] border-b border-zinc-800 bg-zinc-950 p-3">{t('position', lang)}</th>
          <th className="min-w-[150px] border-b border-zinc-800 bg-zinc-950 p-3">{t('star', lang)}</th>
          <th className="min-w-[110px] border-b border-zinc-800 bg-zinc-950 p-3">{t('signLord', lang)}</th>
          <th className="min-w-[110px] border-b border-zinc-800 bg-zinc-950 p-3">{t('starLord', lang)}</th>
          <th className="min-w-[110px] border-b border-zinc-800 bg-zinc-950 p-3">{t('subLord', lang)}</th>
          <th className="min-w-[100px] border-b border-zinc-800 bg-zinc-950 p-3">{t('nature', lang)}</th>
          <th className="min-w-[100px] border-b border-zinc-800 bg-zinc-950 p-3">{t('occupies', lang)}</th>
          <th className="min-w-[100px] border-b border-zinc-800 bg-zinc-950 p-3">{t('owns', lang)}</th>
        </tr>
      </thead>
      <tbody>
        {planets.map((p) => {
          const signLord = p.sign ? SIGN_LORDS[p.sign] : undefined;
          const starLord = starLordOf(p);
          const owns = housesOwnedBy(houses, p.planet);
          const nature = naturalNature(p, planets);
          return (
            <tr key={p.planet} className="group align-top">
              <td className="sticky left-0 z-10 border-b border-zinc-800 bg-black p-3 group-hover:bg-zinc-900">
                <span className="font-semibold text-yellow-300">{planetShortName(p.planet)}</span>
              </td>
              <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{p.sign || '-'}</td>
              <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{p.degree || '-'}</td>
              <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{p.star || '-'}</td>
              <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{signLord || '-'}</td>
              <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{starLord || '-'}</td>
              <td className="border-b border-zinc-800 p-3 font-semibold text-yellow-300 group-hover:bg-zinc-900">{p.subLord || '-'}</td>
              <td className={`border-b border-zinc-800 p-3 font-semibold group-hover:bg-zinc-900 ${nature === 'Benefic' ? 'text-emerald-400' : nature === 'Malefic' ? 'text-red-500' : 'text-zinc-400'}`}>
                {natureLabel(nature, lang)}
              </td>
              <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{p.house ?? '-'}</td>
              <td className="border-b border-zinc-800 p-3 text-zinc-100 group-hover:bg-zinc-900">{houseList(owns)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function HousesPlanetsTable({
  houses,
  planets,
  view = 'houses',
}: {
  houses: SignificatorHouse[];
  planets: SignificatorPlanet[];
  view?: 'houses' | 'planets';
}) {
  const { lang } = useKpLanguage();
  if (!houses.length && !planets.length) {
    return <p className="text-sm text-slate-400">{t('noHouseData', lang)}</p>;
  }

  return (
    <div className="overflow-x-auto">
      {view === 'houses' ? <HousesView houses={houses} planets={planets} /> : <PlanetsView houses={houses} planets={planets} />}
    </div>
  );
}
