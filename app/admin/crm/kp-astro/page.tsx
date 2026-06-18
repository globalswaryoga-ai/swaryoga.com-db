'use client';

import { useMemo, useState } from 'react';
import { Sparkles, Shuffle, Info } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import {
  basicRules,
  getSubRow,
  getHouseMeaning,
  parseHouseList,
  diseasesByNo,
  mindsetByNo,
  professionsByNo,
} from '@/lib/kpAstro';

const HOUSE_TEXT_SOURCES: Record<number, { label: string; data: Record<string, string> }> = {
  3: { label: 'Mindset (3rd house)', data: mindsetByNo },
  6: { label: 'Diseases (6th house)', data: diseasesByNo },
  10: { label: 'Profession (10th house)', data: professionsByNo },
};

export default function KpAstroPage() {
  const [matterIdx, setMatterIdx] = useState<number>(0);
  const [horaryInput, setHoraryInput] = useState<string>('');

  const matter = basicRules[matterIdx];
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
      />

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <p>
          This is a reference lookup, not a chart-casting predictor. Sign/Star/Sub Lord and
          house data below come straight from the rulebook, but a real verdict needs actual
          planetary positions for the moment of the query (an ephemeris) — that part isn&apos;t
          built yet.
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
          {basicRules.map((r, i) => (
            <option key={i} value={i}>{r.matter}</option>
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
    </div>
  );
}
