'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, Loader2, Save, Sparkles, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import KundaliChart from '@/components/admin/crm/kpAstro/KundaliChart';
import DashaDrillDown, { type DashaRow } from '@/components/admin/crm/kpAstro/DashaDrillDown';
import BhavEditor, { type BhavAnalysisRow, normalizeBhavAnalysis } from '@/components/admin/crm/kpAstro/BhavEditor';
import { autoFillBhavRows } from '@/components/admin/crm/kpAstro/bhavAutoFill';
import ABCDSignificatorsPanel from '@/components/admin/crm/kpAstro/ABCDSignificatorsPanel';
import ChartDetailsPanel from '@/components/admin/crm/kpAstro/ChartDetailsPanel';
import EventTimingPanel from '@/components/admin/crm/kpAstro/EventTimingPanel';
import { KpLanguageProvider, KpLanguageToggle } from '@/components/admin/crm/kpAstro/KpLanguageContext';
import { housesOwnedBy, housesOccupiedBy, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';

interface ChartListItem { _id: string; personName: string; gender?: string; updatedAt: string; }

interface ChartDetail {
  _id: string;
  personName: string;
  ascendant?: { sign?: string; degree?: string };
  houses?: SignificatorHouse[];
  planets?: Array<SignificatorPlanet & { retrograde?: boolean; combust?: boolean }>;
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
function findCurrentDasha(rows: DashaRow[]): { maha?: DashaRow; antar?: DashaRow; pratyantar?: DashaRow } {
  const maha = rows.find((r) => r.level === 'maha' && isCurrentlyActive(r));
  const antar = maha ? rows.find((r) => r.level === 'antar' && r.parentPath === maha.planet && isCurrentlyActive(r)) : undefined;
  const pratyantar = antar ? rows.find((r) => r.level === 'pratyantar' && r.parentPath === `${maha?.planet}-${antar.planet}` && isCurrentlyActive(r)) : undefined;
  return { maha, antar, pratyantar };
}

function dashaChainText(rows: DashaRow[]): string {
  const { maha, antar, pratyantar } = findCurrentDasha(rows);
  return [maha?.planet, antar?.planet, pratyantar?.planet].filter(Boolean).join('-');
}

function hasKaryeshWork(row: BhavAnalysisRow): boolean {
  return Boolean(
    row.toolkitMatter || row.karyeshRuleConclusion || row.karyeshRuleResult ||
    row.cslStarLordOwner || row.cslStarLordSignification || row.subLordKaryeshBhav
  );
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
  const [workView, setWorkView] = useState<'analysis' | 'abcd' | 'details'>('analysis');
  const [bhavRows, setBhavRows] = useState<BhavAnalysisRow[]>(normalizeBhavAnalysis(undefined));
  const [dashaPeriods, setDashaPeriods] = useState<DashaRow[]>([]);
  const { maha: currentMaha, antar: currentAntar, pratyantar: currentPratyantar } = useMemo(() => findCurrentDasha(dashaPeriods), [dashaPeriods]);
  const bhavStats = useMemo(() => {
    const included = bhavRows.filter((row) => row.includeInPrediction !== false);
    const ordered = included.filter((row) => row.predictionOrder > 0);
    const karyeshReady = included.filter(hasKaryeshWork);
    const conclusions = included.filter((row) => row.karyeshRuleConclusion || row.freeNotes || row.positiveNotes || row.negativeNotes);
    return {
      included: included.length,
      ordered: ordered.length,
      karyeshReady: karyeshReady.length,
      conclusions: conclusions.length,
    };
  }, [bhavRows]);

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
      const loadedDashaPeriods = Array.isArray(json.data.dashaPeriods) ? json.data.dashaPeriods : [];
      setBhavRows(autoFillBhavRows(normalized, json.data.houses || [], json.data.planets || [], dashaChainText(loadedDashaPeriods)));
      setDashaPeriods(loadedDashaPeriods);
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

  const handleAutoFillNeedful = () => {
    if (!chart) return;
    setBhavRows((prev) => autoFillBhavRows(prev, chart.houses || [], chart.planets || [], dashaChainText(dashaPeriods)));
  };

  return (
    <KpLanguageProvider>
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader theme="light"
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

      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <ClipboardList className="h-4 w-4 text-indigo-500" />
          Chart
        </label>
        <select
          value={chartId}
          onChange={(e) => router.push(e.target.value ? `/admin/crm/kp-astro/workspace?chartId=${e.target.value}` : '/admin/crm/kp-astro/workspace')}
          className="min-h-[42px] rounded-xl border border-gray-300 px-3 py-2 text-sm flex-1 min-w-[220px] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">— select a birth chart —</option>
          {chartList.map((c) => <option key={c._id} value={c._id}>{c.personName}</option>)}
        </select>
        <Link href="/admin/crm/kp-astro/data-entry" className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 whitespace-nowrap">+ New chart</Link>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {!loading && chart && (
        <>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'Bhavs in Use', value: `${bhavStats.included}/12`, icon: BookOpen, tone: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
            { label: 'Ordered Points', value: String(bhavStats.ordered), icon: ClipboardList, tone: 'text-sky-700 bg-sky-50 border-sky-100' },
            { label: 'Karyesh Ready', value: String(bhavStats.karyeshReady), icon: Wand2, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
            { label: 'Conclusions', value: String(bhavStats.conclusions), icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-2xl border p-3 ${item.tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold leading-none">{item.value}</p>
                  </div>
                  <Icon className="h-5 w-5 shrink-0 opacity-80" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
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
                  <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
                    {(['north', 'south'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setChartStyle(style)}
                        className={`px-2 py-1 text-xs font-medium rounded-md ${chartStyle === style ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        {style === 'north' ? 'North' : 'South'}
                      </button>
                    ))}
                  </div>
                  <KpLanguageToggle />
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
            <div className="flex flex-wrap items-center justify-between gap-3 sticky top-0 bg-gray-50/80 backdrop-blur py-1 z-10">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-semibold text-gray-900">
                  {workView === 'analysis' ? '12 Bhav Analysis' : workView === 'abcd' ? 'ABCD Significators' : 'Houses & Planets'}
                </h2>
                <div className="inline-flex rounded-xl border border-gray-300 bg-white p-1 shadow-sm">
                  {([
                    ['analysis', '12 Bhav'],
                    ['abcd', 'ABCD Sig.'],
                    ['details', 'Houses & Planets'],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setWorkView(mode)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${workView === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {savedAt && <span className="text-xs text-emerald-600">Saved {savedAt.toLocaleTimeString()}</span>}
                <button
                  type="button"
                  onClick={handleAutoFillNeedful}
                  className="flex min-h-[38px] items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  <Wand2 className="h-4 w-4" />
                  Auto Fill
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className="flex min-h-[38px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
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
                {currentPratyantar && (
                  <p className="text-indigo-900">
                    Vidasha: <span className="font-medium">{currentPratyantar.planet}</span>{' '}
                    <span className="text-indigo-600">
                      (owns houses {housesOwnedBy(chart.houses || [], currentPratyantar.planet).join(', ') || '-'}; occupies house {housesOccupiedBy(chart.planets || [], currentPratyantar.planet).join(', ') || '-'})
                    </span>
                  </p>
                )}
                <p className="text-xs text-indigo-500">Weigh these lords' own significations against each bhav's significators below — a house's static data doesn't predict on its own; the active dasha modifies which results actually manifest now.</p>
              </div>
            )}
            {workView === 'analysis' ? (
              <BhavEditor rows={bhavRows} onChange={setBhavRows} houses={chart.houses || []} planets={chart.planets || []} />
            ) : workView === 'abcd' ? (
              <ABCDSignificatorsPanel houses={chart.houses || []} planets={chart.planets || []} bhavRows={bhavRows} />
            ) : (
              <ChartDetailsPanel houses={chart.houses || []} planets={chart.planets || []} />
            )}
            {token && <EventTimingPanel chartId={chartId} token={token} />}
          </div>
        </div>
        </>
      )}

      {!loading && !chart && !chartId && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a chart above to start working through its bhavs.
        </div>
      )}
    </div>
    </KpLanguageProvider>
  );
}
