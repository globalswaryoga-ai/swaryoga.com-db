'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, Save, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import KundaliChart from '@/components/admin/crm/kpAstro/KundaliChart';
import DashaDrillDown, { type DashaRow } from '@/components/admin/crm/kpAstro/DashaDrillDown';
import BhavEditor, { type BhavAnalysisRow, normalizeBhavAnalysis } from '@/components/admin/crm/kpAstro/BhavEditor';
import { autoFillBhavRows } from '@/components/admin/crm/kpAstro/bhavAutoFill';
import HousesPlanetsTable from '@/components/admin/crm/kpAstro/HousesPlanetsTable';
import EventTimingPanel from '@/components/admin/crm/kpAstro/EventTimingPanel';
import { housesOwnedBy, housesOccupiedBy, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';

interface ChartListItem { _id: string; personName: string; gender?: string; updatedAt: string; }

interface ChartDetail {
  _id: string;
  personName: string;
  ascendant?: { sign?: string; degree?: string };
  houses?: SignificatorHouse[];
  planets?: Array<SignificatorPlanet & { retrograde?: boolean }>;
  chartStyle?: 'north' | 'south';
  bhavAnalysis?: BhavAnalysisRow[];
  dashaPeriods?: DashaRow[];
}

// Fills in any Sub Lord / A/B/C/D field the astrologer hasn't already typed
// something into — computed fresh from the chart's houses/planets so a
// recalculated chart keeps re-deriving still-blank fields, while anything
// the astrologer already entered or edited is left untouched.
function isCurrentlyActive(row: DashaRow): boolean {
  const now = Date.now();
  return now >= new Date(row.startDate).getTime() && now < new Date(row.endDate).getTime();
}

// Predictions need to weigh the bhav's own significators together with
// whichever Mahadasha/Antardasha is running right now, not just the
// house's static data — find both from the already-loaded dasha tree.
function findCurrentDasha(rows: DashaRow[]): { maha?: DashaRow; antar?: DashaRow } {
  const maha = rows.find((r) => r.level === 'maha' && isCurrentlyActive(r));
  const antar = maha ? rows.find((r) => r.level === 'antar' && r.parentPath === maha.planet && isCurrentlyActive(r)) : undefined;
  return { maha, antar };
}

export default function KpAstrologerWorkspacePage() {
  const token = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chartId = searchParams.get('chartId') || '';

  const [chartList, setChartList] = useState<ChartListItem[]>([]);
  const [chart, setChart] = useState<ChartDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [chartStyle, setChartStyle] = useState<'north' | 'south'>('north');
  const [chartDisplayMode, setChartDisplayMode] = useState<'planet' | 'bhav'>('planet');
  const [bhavRows, setBhavRows] = useState<BhavAnalysisRow[]>(normalizeBhavAnalysis(undefined));
  const [dashaPeriods, setDashaPeriods] = useState<DashaRow[]>([]);
  const { maha: currentMaha, antar: currentAntar } = useMemo(() => findCurrentDasha(dashaPeriods), [dashaPeriods]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/kp-astro/charts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((j) => setChartList(Array.isArray(j.data) ? j.data : [])).catch(() => {});
  }, [token]);

  const fetchChart = useCallback(async () => {
    if (!token || !chartId) { setChart(null); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${chartId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load chart');
      setChart(json.data);
      setChartStyle(json.data.chartStyle === 'south' ? 'south' : 'north');
      const normalized = normalizeBhavAnalysis(json.data.bhavAnalysis);
      setBhavRows(autoFillBhavRows(normalized, json.data.houses || [], json.data.planets || []));
      setDashaPeriods(Array.isArray(json.data.dashaPeriods) ? json.data.dashaPeriods : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chart');
    } finally {
      setLoading(false);
    }
  }, [token, chartId]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  const handleSave = async () => {
    if (!token || !chartId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${chartId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartStyle, bhavAnalysis: bhavRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            Astrologer Workspace
          </span>
        }
        subtitle="Work through every bhav before finalizing a prediction — final write-up reads from what you save here"
        action={
          chartId && (
            <Link href={`/admin/crm/kp-astro/final-prediction?chartId=${chartId}`} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
              Final Prediction <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-500">Chart:</label>
        <select
          value={chartId}
          onChange={(e) => router.push(e.target.value ? `/admin/crm/kp-astro/workspace?chartId=${e.target.value}` : '/admin/crm/kp-astro/workspace')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1 min-w-[200px]"
        >
          <option value="">— select a birth chart —</option>
          {chartList.map((c) => <option key={c._id} value={c._id}>{c.personName}</option>)}
        </select>
        <Link href="/admin/crm/kp-astro/data-entry" className="text-sm text-indigo-600 hover:underline whitespace-nowrap">+ New chart</Link>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {!loading && chart && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">{chart.personName}</h2>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
                    {(['planet', 'bhav'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setChartDisplayMode(mode)}
                        className={`px-2 py-1 text-xs font-medium rounded-md ${chartDisplayMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        {mode === 'planet' ? 'Planet' : 'Bhav'}
                      </button>
                    ))}
                  </div>
                  <select value={chartStyle} onChange={(e) => setChartStyle(e.target.value as 'north' | 'south')} className="rounded-lg border border-gray-300 px-2 py-1 text-xs">
                    <option value="north">North Indian</option>
                    <option value="south">South Indian</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-center">
                <KundaliChart
                  chartStyle={chartStyle}
                  ascendantSign={chart.ascendant?.sign || ''}
                  houses={chart.houses}
                  planets={chart.planets}
                  size={320}
                  displayMode={chartDisplayMode}
                />
              </div>
            </div>

            {dashaPeriods.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Vimshottari Dasha</h3>
                <DashaDrillDown rows={dashaPeriods} onLoadDeeper={(newRows) => setDashaPeriods((prev) => [...prev, ...newRows])} />
              </div>
            ) : (
              <p className="text-xs text-gray-400 px-1">No dasha tree saved on this chart yet — recalculate it from the Data Entry "Calculate" panel to get Antar/Pratyantar drill-down.</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between sticky top-0 bg-gray-50/80 backdrop-blur py-1 z-10">
              <h2 className="font-semibold text-gray-900">12-Bhav Analysis</h2>
              <div className="flex items-center gap-3">
                {savedAt && <span className="text-xs text-emerald-600">Saved {savedAt.toLocaleTimeString()}</span>}
                <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
            {(currentMaha || currentAntar) && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm space-y-1">
                <p className="font-semibold text-indigo-900">Currently Running Dasha</p>
                {currentMaha && (
                  <p className="text-indigo-900">
                    Mahadasha: <span className="font-medium">{currentMaha.planet}</span>{' '}
                    <span className="text-indigo-600">
                      (owns houses {housesOwnedBy(chart.houses || [], currentMaha.planet).join(', ') || '—'}; occupies house {housesOccupiedBy(chart.planets || [], currentMaha.planet).join(', ') || '—'})
                    </span>
                  </p>
                )}
                {currentAntar && (
                  <p className="text-indigo-900">
                    Antardasha: <span className="font-medium">{currentAntar.planet}</span>{' '}
                    <span className="text-indigo-600">
                      (owns houses {housesOwnedBy(chart.houses || [], currentAntar.planet).join(', ') || '—'}; occupies house {housesOccupiedBy(chart.planets || [], currentAntar.planet).join(', ') || '—'})
                    </span>
                  </p>
                )}
                <p className="text-xs text-indigo-500">Weigh these lords' own significations against each bhav's significators below — a house's static data doesn't predict on its own; the active dasha modifies which results actually manifest now.</p>
              </div>
            )}
            <details className="rounded-2xl border border-gray-200 bg-white open:pb-3" open>
              <summary className="cursor-pointer p-3 font-semibold text-gray-900 text-sm">
                Houses &amp; Planets Reference (for filling ABCD)
              </summary>
              <div className="px-3">
                <HousesPlanetsTable houses={chart.houses || []} planets={chart.planets || []} />
              </div>
            </details>
            <BhavEditor rows={bhavRows} onChange={setBhavRows} />
            {token && <EventTimingPanel chartId={chartId} token={token} />}
          </div>
        </div>
      )}

      {!loading && !chart && !chartId && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a chart above to start working through its bhavs.
        </div>
      )}
    </div>
  );
}
