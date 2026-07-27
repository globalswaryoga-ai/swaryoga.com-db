'use client';

// KP event-timing tool: finds Dasha periods where the running
// Mahadasha-Antardasha-Pratyantardasha chain signifies the given houses
// (e.g. marriage = 2, 7, 11), then refines with Sun/Moon transit and
// (optionally, given a birthplace) the transiting Lagna for hour-level
// timing. See lib/kpAstro/eventTiming.ts for the underlying rule.

import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

interface EventTimingWindow {
  mahaLord: string;
  antarLord: string;
  pratyantarLord: string;
  startDate: string;
  endDate: string;
  matchedLevels: number;
  transitMatches: Array<{ date: string; sunMatchStrength: number; moonMatchStrength: number; sunMatch: boolean; moonMatch: boolean; moonSubMatch: boolean }>;
  bestDate: string | null;
  lagnaRefinement: Array<{ hour: number; lagnaSign: string; match: boolean }> | null;
}

interface SlowTransitMatch {
  monthStart: string;
  jupiterMatchStrength: number;
  saturnMatchStrength: number;
}

interface EventTimingResult {
  targetHouses: number[];
  significators: Array<{ planet: string; matchedHouses: number[] }>;
  totalWindowsFound: number;
  windows: EventTimingWindow[];
  slowTransitMatches: SlowTransitMatch[];
  lagnaRefinementSkipped: boolean;
}

function fmtMonth(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN');
}

export default function EventTimingPanel({
  chartId,
  token,
  initialHouses,
  initialSearchFrom,
  initialSearchUntil,
  autoSearchKey,
}: {
  chartId: string;
  token: string;
  // When provided (e.g. by the Dasha Prediction page's drill-down selection),
  // pre-fills the fields below and re-runs the search automatically whenever
  // autoSearchKey changes -- so picking a Bhukti/Antara elsewhere on the page
  // drives this tool instead of the astrologer re-typing houses by hand.
  // Omitted entirely, this keeps its original manual-only behaviour.
  initialHouses?: string;
  initialSearchFrom?: string;
  initialSearchUntil?: string;
  autoSearchKey?: string;
}) {
  const [housesInput, setHousesInput] = useState(initialHouses || '2, 7, 11');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [utcOffsetHours, setUtcOffsetHours] = useState('5.5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EventTimingResult | null>(null);

  const search = async (housesOverride?: string) => {
    const source = housesOverride ?? housesInput;
    const targetHouses = source.split(',').map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= 12);
    if (targetHouses.length === 0) { setError('Enter at least one house number (1-12)'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body: Record<string, unknown> = { targetHouses };
      if (initialSearchFrom) body.searchFrom = initialSearchFrom;
      if (initialSearchUntil) body.searchUntil = initialSearchUntil;
      if (latitude && longitude && utcOffsetHours) {
        body.latitude = Number(latitude);
        body.longitude = Number(longitude);
        body.utcOffsetHours = Number(utcOffsetHours);
      }
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${chartId}/event-timing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Search failed');
      setResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!initialHouses || !autoSearchKey) return;
    setHousesInput(initialHouses);
    search(initialHouses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchKey]);

  return (
    <details open={Boolean(initialHouses)} className="rounded-2xl border border-gray-200 bg-white open:pb-3">
      <summary className="cursor-pointer p-3 font-semibold text-gray-900 text-sm">Event Timing (Dasha chain + transit)</summary>
      <div className="px-3 space-y-3">
        <p className="text-xs text-gray-500">
          Finds Dasha periods where the running Mahadasha-Antardasha-Pratyantardasha chain signifies the houses below, then refines with Sun/Moon transit. Example: Marriage = 2, 7, 11.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Target houses (comma-separated)</label>
            <input value={housesInput} onChange={(e) => setHousesInput(e.target.value)} className="mt-1 w-40 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Latitude (optional, for hour-level)</label>
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 17.6599" className="mt-1 w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Longitude</label>
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 75.9064" className="mt-1 w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">UTC Offset</label>
            <input value={utcOffsetHours} onChange={(e) => setUtcOffsetHours(e.target.value)} placeholder="5.5" className="mt-1 w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <button type="button" onClick={() => search()} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Significators of house{result.targetHouses.length > 1 ? 's' : ''} {result.targetHouses.join(', ')}:{' '}
              <span className="font-medium">{result.significators.map((s) => s.planet).join(', ') || 'none found'}</span>
            </p>
            {result.slowTransitMatches.length > 0 && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                <p className="text-xs font-semibold text-indigo-800">
                  Long-term candidate years (Jupiter + Saturn transit)
                </p>
                <p className="mt-0.5 text-[11px] text-indigo-600">
                  Sun/Moon repeat every year/month regardless, so they can&apos;t tell one year of a multi-year search apart from another — Jupiter (~1yr/sign) and Saturn (~2.5yr/sign) are slow enough to do that.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.slowTransitMatches.map((m, i) => (
                    <span key={i} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200">
                      {fmtMonth(m.monthStart)}
                      {m.jupiterMatchStrength > 0 && <span className="ml-1 text-amber-600">Ju×{m.jupiterMatchStrength}</span>}
                      {m.saturnMatchStrength > 0 && <span className="ml-1 text-slate-600">Sa×{m.saturnMatchStrength}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400">{result.totalWindowsFound} dasha-chain window(s) found in range · showing top {result.windows.length}</p>
            {result.lagnaRefinementSkipped && (
              <p className="text-xs text-amber-600">Hour-level Lagna refinement skipped — enter latitude/longitude/UTC offset above to include it.</p>
            )}
            {result.windows.length === 0 ? (
              <p className="text-sm text-gray-400">No matching dasha-chain window found in the searched range.</p>
            ) : (
              result.windows.map((w, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 text-sm space-y-2">
                  <p className="font-medium text-gray-900">
                    {w.mahaLord} – {w.antarLord} – {w.pratyantarLord}{' '}
                    <span className="text-xs text-gray-400">({w.matchedLevels}/3 levels match · {fmtDate(w.startDate)} – {fmtDate(w.endDate)})</span>
                  </p>
                  {w.bestDate && (
                    <p className="text-indigo-700">
                      Best transit-confirmed date: <span className="font-semibold">{fmtDate(w.bestDate)}</span>
                    </p>
                  )}
                  {w.transitMatches.length > 0 && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer">All {w.transitMatches.length} matching date(s) in this window</summary>
                      <div className="mt-1 space-y-0.5">
                        {[...w.transitMatches].sort((a, b) => (b.sunMatchStrength + b.moonMatchStrength) - (a.sunMatchStrength + a.moonMatchStrength)).map((m, j) => (
                          <p key={j}>
                            {fmtDate(m.date)} — Sun {m.sunMatchStrength}/3 · Moon {m.moonMatchStrength}/3 {m.moonSubMatch && '(Sub match)'}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                  {w.lagnaRefinement && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer">Hour-level Lagna match for {w.bestDate ? fmtDate(w.bestDate) : ''}</summary>
                      <div className="mt-1 space-y-0.5">
                        {w.lagnaRefinement.filter((h) => h.match).map((h, j) => (
                          <p key={j}>{h.hour}:00 — Lagna {h.lagnaSign}</p>
                        ))}
                        {w.lagnaRefinement.every((h) => !h.match) && <p>No hour matched within this day.</p>}
                      </div>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </details>
  );
}
