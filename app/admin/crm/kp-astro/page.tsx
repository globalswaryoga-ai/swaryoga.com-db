'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Shuffle, Info, RefreshCw, Clock } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import { SPECIAL_ASPECT_OFFSETS } from '@/lib/kpAstro/aspectAnalysis';
import {
  basicRules,
  getSubRow,
  getHouseMeaning,
  parseHouseList,
  diseasesByNo,
  mindsetByNo,
  professionsByNo,
  aspectRules,
} from '@/lib/kpAstro';

interface RulingPlanetsSnapshot {
  capturedAt: string; dayLord: string;
  lagnaSign: string; lagnaSignLord: string; lagnaStarLord: string; lagnaSubLord: string;
  moonSign: string; moonSignLord: string; moonStarLord: string; moonSubLord: string;
  retrogradePlanets: string[];
}

function RulingPlanetsNow() {
  const token = useAuth();
  const [rp, setRp] = useState<RulingPlanetsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState('18.5204');
  const [longitude, setLongitude] = useState('73.8567');
  const [utcOffsetHours, setUtcOffsetHours] = useState('5.5');

  const fetchNow = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/ruling-planets/now?latitude=${latitude}&longitude=${longitude}&utcOffsetHours=${utcOffsetHours}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setRp(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNow();
    const interval = setInterval(fetchNow, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-500" /> Ruling Planets — Right Now</h2>
        <div className="flex items-center gap-2">
          <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Lat" className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs" />
          <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Lon" className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs" />
          <input value={utcOffsetHours} onChange={(e) => setUtcOffsetHours(e.target.value)} placeholder="UTC+" className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-xs" />
          <button type="button" onClick={fetchNow} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {rp && (
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-gray-500">Day Lord: <b className="text-gray-900">{rp.dayLord}</b></span>
          <span className="text-gray-500">Lagna: <b className="text-gray-900">{rp.lagnaSign}</b></span>
          <span className="text-gray-500">Lagna Sign Lord: <b className="text-gray-900">{rp.lagnaSignLord}</b></span>
          <span className="text-gray-500">Lagna Star Lord: <b className="text-gray-900">{rp.lagnaStarLord}</b></span>
          <span className="text-gray-500">Lagna Sub Lord: <b className="text-indigo-600">{rp.lagnaSubLord}</b></span>
          <span className="text-gray-500">Moon Sign: <b className="text-gray-900">{rp.moonSign}</b></span>
          <span className="text-gray-500">Moon Sign Lord: <b className="text-gray-900">{rp.moonSignLord}</b></span>
          <span className="text-gray-500">Moon Star Lord: <b className="text-gray-900">{rp.moonStarLord}</b></span>
          <span className="text-gray-500">Moon Sub Lord: <b className="text-indigo-600">{rp.moonSubLord}</b></span>
          {!!rp.retrogradePlanets?.length && <span className="text-amber-600 sm:col-span-2">Retrograde: {rp.retrogradePlanets.join(', ')}</span>}
        </div>
      )}
      <p className="text-xs text-gray-400">Updates every 5 minutes — used for live horary corroboration, not stored anywhere until you cast a horary chart.</p>
    </div>
  );
}

const HOUSE_TEXT_SOURCES: Record<number, { label: string; data: Record<string, string> }> = {
  3: { label: 'Mindset (3rd house)', data: mindsetByNo },
  6: { label: 'Diseases (6th house)', data: diseasesByNo },
  10: { label: 'Profession (10th house)', data: professionsByNo },
};

export default function KpAstroPage() {
  const [matterIdx, setMatterIdx] = useState<number>(0);
  const [horaryInput, setHoraryInput] = useState<string>('');

  const matter = basicRules[matterIdx];
  const matterGroups = useMemo(() => {
    const groups: { category: string; items: { index: number; matter: string }[] }[] = [];
    basicRules.forEach((r, index) => {
      const category = r.category || 'Other';
      let group = groups.find((g) => g.category === category);
      if (!group) {
        group = { category, items: [] };
        groups.push(group);
      }
      group.items.push({ index, matter: r.matter });
    });
    return groups;
  }, []);
  const relevantHouses = useMemo(() => {
    if (!matter) return [];
    const houses = new Set<number>(parseHouseList(matter.supportingHouses));
    if (typeof matter.primaryHouse === 'number') houses.add(matter.primaryHouse);
    return Array.from(houses).sort((a, b) => a - b);
  }, [matter]);

  const horaryNo = Number(horaryInput);
  const subRow = horaryNo >= 1 && horaryNo <= 249 ? getSubRow(horaryNo) : undefined;

  const houseTextMatches = relevantHouses
    .filter((h) => HOUSE_TEXT_SOURCES[h])
    .map((h) => ({ house: h, ...HOUSE_TEXT_SOURCES[h] }));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            KP Astro
          </span>
        }
        subtitle="KP astrology reference & lookup tool, built from the TFU MasterClass rulebook"
        action={
          <Link
            href="/admin/crm/kp-astro/charts"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Horoscope Charts →
          </Link>
        }
      />

      <RulingPlanetsNow />

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <p>
          This panel below is a static rulebook reference lookup (matter → house → sub-lord
          interpretation text). For a real chart-cast verdict with actual planetary positions,
          use <Link href="/admin/crm/kp-astro/horary" className="underline font-medium">Horary</Link> or{' '}
          <Link href="/admin/crm/kp-astro/charts" className="underline font-medium">Birth Charts</Link> instead.
        </p>
      </div>

      {/* Step 1: Matter -> Houses */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">1. What is the question about?</h2>
        <select
          value={matterIdx}
          onChange={(e) => setMatterIdx(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {matterGroups.map((g) => (
            <optgroup key={g.category} label={g.category}>
              {g.items.map((item) => (
                <option key={item.index} value={item.index}>{item.matter}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {matter && (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Primary House</p>
              <p className="text-gray-900 font-medium">{matter.primaryHouse ?? '—'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Supporting Houses</p>
              <p className="text-gray-900 font-medium">{matter.supportingHouses || '—'}</p>
            </div>
          </div>
        )}

        {relevantHouses.length > 0 && (
          <div className="space-y-2">
            {relevantHouses.map((h) => (
              <details key={h} className="rounded-lg border border-gray-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-800">House {h}</summary>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{getHouseMeaning(h)}</p>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Horary number lookup */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">2. Horary number (1–249)</h2>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={249}
            value={horaryInput}
            onChange={(e) => setHoraryInput(e.target.value)}
            placeholder="e.g. 137"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setHoraryInput(String(Math.floor(Math.random() * 249) + 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <Shuffle className="h-4 w-4" />
            Random
          </button>
        </div>

        {horaryInput && !subRow && (
          <p className="text-sm text-red-600">Enter a number between 1 and 249.</p>
        )}

        {subRow && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Sign</p>
                <p className="text-gray-900 font-medium">{subRow.sign} <span className="text-gray-400">({subRow.signLord})</span></p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Star</p>
                <p className="text-gray-900 font-medium">{subRow.star} <span className="text-gray-400">({subRow.starLord})</span></p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-xs uppercase text-indigo-400 font-semibold mb-1">Sub Lord</p>
                <p className="text-indigo-900 font-bold">{subRow.subLord}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">Degree range: {subRow.from} – {subRow.to}</p>

            {houseTextMatches.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-xs uppercase text-gray-400 font-semibold">
                  Sub-lord interpretations relevant to &quot;{matter?.matter}&quot;
                </p>
                {houseTextMatches.map(({ house, label, data }) => (
                  <div key={house} className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">{label}</p>
                    <p className="text-sm text-amber-900">{data[String(horaryNo)] || 'No entry for this number.'}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 3: Drishti house-rule & conjunction orbs (general reference, not tied to the matter/horary above) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">3. Drishti (special aspects) &amp; conjunction orbs</h2>
        <div className="space-y-2">
          <p className="text-xs uppercase text-gray-400 font-semibold">Drishti — houses aspected, counted from the planet's own house</p>
          {Object.entries(SPECIAL_ASPECT_OFFSETS).map(([planet, offsets]) => (
            <div key={planet} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
              <span className="text-gray-700">{planet}</span>
              <span className="font-semibold text-gray-900">{offsets.join(', ')}</span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
            <span className="text-gray-700">All other planets</span>
            <span className="font-semibold text-gray-900">7</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase text-gray-400 font-semibold">Conjunction orbs</p>
          {Object.entries(aspectRules.orbs).map(([planets, orb]) => (
            <div key={planets} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
              <span className="text-gray-700">{planets}</span>
              <span className="font-semibold text-gray-900">{orb}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
