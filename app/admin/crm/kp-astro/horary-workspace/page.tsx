'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, Loader2, Save, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import KundaliChart from '@/components/admin/crm/kpAstro/KundaliChart';
import BhavEditor, { type BhavAnalysisRow, normalizeBhavAnalysis } from '@/components/admin/crm/kpAstro/BhavEditor';
import { autoFillBhavRows } from '@/components/admin/crm/kpAstro/bhavAutoFill';
import type { SignificatorHouse, SignificatorPlanet } from '@/lib/kpAstro/significators';

interface HoraryListItem { _id: string; questionText: string; horaryNumber: number; updatedAt: string; }

interface RulingPlanets {
  capturedAt?: string; dayLord?: string;
  lagnaSign?: string; lagnaSignLord?: string; lagnaStarLord?: string; lagnaSubLord?: string;
  moonSign?: string; moonSignLord?: string; moonStarLord?: string; moonSubLord?: string;
  retrogradePlanets?: string[];
}

interface HoraryDetail {
  _id: string;
  questionText: string;
  querentName?: string;
  horaryNumber: number;
  ascendant?: { sign?: string; degree?: string };
  houses?: SignificatorHouse[];
  planets?: Array<SignificatorPlanet & { retrograde?: boolean }>;
  chartStyle?: 'north' | 'south';
  bhavAnalysis?: BhavAnalysisRow[];
  rulingPlanets?: RulingPlanets;
}

export default function KpHoraryWorkspacePage() {
  const token = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chartId = searchParams.get('chartId') || '';

  const [chartList, setChartList] = useState<HoraryListItem[]>([]);
  const [chart, setChart] = useState<HoraryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [chartStyle, setChartStyle] = useState<'north' | 'south'>('north');
  const [chartDisplayMode, setChartDisplayMode] = useState<'planet' | 'bhav'>('planet');
  const [bhavRows, setBhavRows] = useState<BhavAnalysisRow[]>(normalizeBhavAnalysis(undefined));

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/kp-astro/horary', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((j) => setChartList(Array.isArray(j.data) ? j.data : [])).catch(() => {});
  }, [token]);

  const fetchChart = useCallback(async () => {
    if (!token || !chartId) { setChart(null); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/horary/${chartId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load chart');
      setChart(json.data);
      setChartStyle(json.data.chartStyle === 'south' ? 'south' : 'north');
      const normalized = normalizeBhavAnalysis(json.data.bhavAnalysis);
      setBhavRows(autoFillBhavRows(normalized, json.data.houses || [], json.data.planets || []));
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
      const res = await fetch(`/api/admin/crm/kp-astro/horary/${chartId}`, {
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

  const rp = chart?.rulingPlanets;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-indigo-500" />
            Horary Workspace
          </span>
        }
        subtitle="Judge the question using significators and the Ruling Planets captured at the moment asked"
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-500">Question:</label>
        <select
          value={chartId}
          onChange={(e) => router.push(e.target.value ? `/admin/crm/kp-astro/horary-workspace?chartId=${e.target.value}` : '/admin/crm/kp-astro/horary-workspace')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1 min-w-[200px]"
        >
          <option value="">— select a horary question —</option>
          {chartList.map((c) => <option key={c._id} value={c._id}>#{c.horaryNumber} — {c.questionText.slice(0, 50)}</option>)}
        </select>
        <Link href="/admin/crm/kp-astro/horary" className="text-sm text-indigo-600 hover:underline whitespace-nowrap">+ New question</Link>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {!loading && chart && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">#{chart.horaryNumber} — {chart.questionText}</h2>
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

            {rp && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1.5 text-xs">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Ruling Planets (at the moment asked)</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-600">
                  <span>Day Lord: <b className="text-gray-900">{rp.dayLord}</b></span>
                  <span>Lagna: <b className="text-gray-900">{rp.lagnaSign}</b></span>
                  <span>Lagna Sign Lord: <b className="text-gray-900">{rp.lagnaSignLord}</b></span>
                  <span>Lagna Star Lord: <b className="text-gray-900">{rp.lagnaStarLord}</b></span>
                  <span>Lagna Sub Lord: <b className="text-gray-900">{rp.lagnaSubLord}</b></span>
                  <span>Moon Sign: <b className="text-gray-900">{rp.moonSign}</b></span>
                  <span>Moon Sign Lord: <b className="text-gray-900">{rp.moonSignLord}</b></span>
                  <span>Moon Star Lord: <b className="text-gray-900">{rp.moonStarLord}</b></span>
                  <span>Moon Sub Lord: <b className="text-gray-900">{rp.moonSubLord}</b></span>
                </div>
                {!!rp.retrogradePlanets?.length && <p className="pt-1 text-amber-600">Retrograde: {rp.retrogradePlanets.join(', ')}</p>}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between sticky top-0 bg-gray-50/80 backdrop-blur py-1 z-10">
              <h2 className="font-semibold text-gray-900">12-Bhav Analysis</h2>
              <div className="flex items-center gap-3">
                {savedAt && <span className="text-xs text-emerald-600">Saved {savedAt.toLocaleTimeString()}</span>}
                <Link href={`/admin/crm/kp-astro/final-prediction?horaryChartId=${chartId}`} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
                  Final Judgment <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
            <BhavEditor rows={bhavRows} onChange={setBhavRows} />
          </div>
        </div>
      )}

      {!loading && !chart && !chartId && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a horary question above to start judging it.
        </div>
      )}
    </div>
  );
}
