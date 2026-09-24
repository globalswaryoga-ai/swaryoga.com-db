'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, Save, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import KundaliChart from '@/components/admin/crm/kpAstro/KundaliChart';
import BhavEditor, { type BhavAnalysisRow, normalizeBhavAnalysis } from '@/components/admin/crm/kpAstro/BhavEditor';
import { autoFillBhavRows, type MatterRule } from '@/components/admin/crm/kpAstro/bhavAutoFill';
import { useMatterRules } from '@/components/admin/crm/kpAstro/useMatterRules';
import ABCDSignificatorsPanel from '@/components/admin/crm/kpAstro/ABCDSignificatorsPanel';
import ChartDetailsPanel from '@/components/admin/crm/kpAstro/ChartDetailsPanel';
import DashaDrillDown, { type DashaRow } from '@/components/admin/crm/kpAstro/DashaDrillDown';
import { KpLanguageProvider, KpLanguageToggle } from '@/components/admin/crm/kpAstro/KpLanguageContext';
import type { SignificatorHouse, SignificatorPlanet } from '@/lib/kpAstro/significators';

interface MatchListItem { _id: string; label?: string; groomChartId?: { personName: string }; brideChartId?: { personName: string }; }

interface ChartRef {
  personName: string;
  ascendant?: { sign?: string };
  houses?: SignificatorHouse[];
  planets?: Array<SignificatorPlanet & { retrograde?: boolean; combust?: boolean }>;
  chartStyle?: 'north' | 'south';
  dashaPeriods?: DashaRow[];
}

interface MatchDetail {
  _id: string;
  label?: string;
  groomChartId?: ChartRef;
  brideChartId?: ChartRef;
  groomBhavAnalysis?: BhavAnalysisRow[];
  brideBhavAnalysis?: BhavAnalysisRow[];
  compatibilityNotes?: string;
}

type WorkView = 'analysis' | 'abcd' | 'details';

function PartnerPanel({
  label,
  person,
  chartStyle,
  chartDisplayMode,
  rows,
  onRowsChange,
  workView,
  setWorkView,
  dashaPeriods,
  onLoadDeeperDasha,
  matterRules,
  onMatterRulesChanged,
}: {
  label: string;
  person?: ChartRef;
  chartStyle: 'north' | 'south';
  chartDisplayMode: 'planet' | 'bhav';
  rows: BhavAnalysisRow[];
  onRowsChange: (rows: BhavAnalysisRow[]) => void;
  workView: WorkView;
  setWorkView: (v: WorkView) => void;
  dashaPeriods: DashaRow[];
  onLoadDeeperDasha: (newRows: DashaRow[]) => void;
  matterRules: MatterRule[];
  onMatterRulesChanged: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col items-center">
          <h2 className="font-semibold text-gray-900 text-sm mb-2">{label} — {person?.personName || '—'}</h2>
          <KundaliChart
            chartStyle={chartStyle}
            ascendantSign={person?.ascendant?.sign || ''}
            houses={person?.houses}
            planets={person?.planets}
            size={280}
            displayMode={chartDisplayMode}
          />
        </div>

        {dashaPeriods.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Vimshottari Dasha</h3>
            <DashaDrillDown rows={dashaPeriods} onLoadDeeper={onLoadDeeperDasha} />
          </div>
        ) : (
          <p className="text-xs text-gray-400 px-1">No dasha tree saved on this chart yet.</p>
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
              ] as const).map(([mode, tabLabel]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkView(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${workView === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {tabLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
        {workView === 'analysis' ? (
          <BhavEditor rows={rows} onChange={onRowsChange} houses={person?.houses || []} planets={person?.planets || []} matterRules={matterRules} onMatterRulesChanged={onMatterRulesChanged} />
        ) : workView === 'abcd' ? (
          <ABCDSignificatorsPanel houses={person?.houses || []} planets={person?.planets || []} bhavRows={rows} />
        ) : (
          <ChartDetailsPanel houses={person?.houses || []} planets={person?.planets || []} />
        )}
      </div>
    </div>
  );
}

export default function KpMatchmakingWorkspacePage() {
  const token = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('matchId') || '';
  const { rules: matterRules, refresh: refreshMatterRules } = useMatterRules(token);

  const [matchList, setMatchList] = useState<MatchListItem[]>([]);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [groomRows, setGroomRows] = useState<BhavAnalysisRow[]>(normalizeBhavAnalysis(undefined));
  const [brideRows, setBrideRows] = useState<BhavAnalysisRow[]>(normalizeBhavAnalysis(undefined));
  const [compatibilityNotes, setCompatibilityNotes] = useState('');
  const [chartDisplayMode, setChartDisplayMode] = useState<'planet' | 'bhav'>('planet');
  const [chartStyle, setChartStyle] = useState<'north' | 'south'>('north');

  const [groomWorkView, setGroomWorkView] = useState<WorkView>('analysis');
  const [brideWorkView, setBrideWorkView] = useState<WorkView>('analysis');
  const [groomDashaPeriods, setGroomDashaPeriods] = useState<DashaRow[]>([]);
  const [brideDashaPeriods, setBrideDashaPeriods] = useState<DashaRow[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/kp-astro/matchmaking', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((j) => setMatchList(Array.isArray(j.data) ? j.data : [])).catch(() => {});
  }, [token]);

  const fetchMatch = useCallback(async () => {
    if (!token || !matchId) { setMatch(null); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/matchmaking/${matchId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load match');
      setMatch(json.data);
      const groomRows = normalizeBhavAnalysis(json.data.groomBhavAnalysis);
      const brideRows = normalizeBhavAnalysis(json.data.brideBhavAnalysis);
      setGroomRows(autoFillBhavRows(groomRows, json.data.groomChartId?.houses || [], json.data.groomChartId?.planets || [], '', matterRules));
      setBrideRows(autoFillBhavRows(brideRows, json.data.brideChartId?.houses || [], json.data.brideChartId?.planets || [], '', matterRules));
      setCompatibilityNotes(json.data.compatibilityNotes || '');
      setGroomDashaPeriods(Array.isArray(json.data.groomChartId?.dashaPeriods) ? json.data.groomChartId.dashaPeriods : []);
      setBrideDashaPeriods(Array.isArray(json.data.brideChartId?.dashaPeriods) ? json.data.brideChartId.dashaPeriods : []);
      setGroomWorkView('analysis');
      setBrideWorkView('analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [token, matchId]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  const handleSave = async () => {
    if (!token || !matchId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/matchmaking/${matchId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ groomBhavAnalysis: groomRows, brideBhavAnalysis: brideRows, compatibilityNotes }),
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
    <KpLanguageProvider>
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader theme="light"
        title={<span className="flex items-center gap-2"><Heart className="h-6 w-6 text-indigo-500" />Matchmaking Workspace</span>}
        subtitle="Work through both partners' bhavs before generating a compatibility prediction"
        action={
          matchId && (
            <Link href={`/admin/crm/kp-astro/matchmaking/final-prediction?matchId=${matchId}`} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
              Final Prediction <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Match</label>
          <select
            value={matchId}
            onChange={(e) => router.push(e.target.value ? `/admin/crm/kp-astro/matchmaking/workspace?matchId=${e.target.value}` : '/admin/crm/kp-astro/matchmaking/workspace')}
            className="min-h-[42px] rounded-xl border border-gray-300 px-3 py-2 text-sm flex-1 min-w-[220px] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">— select a match —</option>
            {matchList.map((m) => <option key={m._id} value={m._id}>{m.label || `${m.groomChartId?.personName || '?'} ↔ ${m.brideChartId?.personName || '?'}`}</option>)}
          </select>
          <Link href="/admin/crm/kp-astro/matchmaking/data-entry" className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 whitespace-nowrap">+ New match</Link>
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

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {!loading && match && (
        <>
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3">
            {savedAt ? <span className="text-xs text-emerald-600">Saved {savedAt.toLocaleTimeString()}</span> : <span />}
            <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <label className="text-xs font-medium text-gray-500">Compatibility Notes (guna milan score, manglik check, etc.)</label>
            <textarea value={compatibilityNotes} onChange={(e) => setCompatibilityNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <PartnerPanel
            label="Groom"
            person={match.groomChartId}
            chartStyle={chartStyle}
            chartDisplayMode={chartDisplayMode}
            rows={groomRows}
            onRowsChange={setGroomRows}
            workView={groomWorkView}
            setWorkView={setGroomWorkView}
            dashaPeriods={groomDashaPeriods}
            onLoadDeeperDasha={(newRows) => setGroomDashaPeriods((prev) => [...prev, ...newRows])}
            matterRules={matterRules}
            onMatterRulesChanged={refreshMatterRules}
          />

          <div className="border-t border-gray-200" />

          <PartnerPanel
            label="Bride"
            person={match.brideChartId}
            chartStyle={chartStyle}
            chartDisplayMode={chartDisplayMode}
            rows={brideRows}
            onRowsChange={setBrideRows}
            workView={brideWorkView}
            setWorkView={setBrideWorkView}
            dashaPeriods={brideDashaPeriods}
            onLoadDeeperDasha={(newRows) => setBrideDashaPeriods((prev) => [...prev, ...newRows])}
            matterRules={matterRules}
            onMatterRulesChanged={refreshMatterRules}
          />
        </>
      )}

      {!loading && !match && !matchId && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a match above to start working through both partners' bhavs.
        </div>
      )}
    </div>
    </KpLanguageProvider>
  );
}
