'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, Save, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import KundaliChart from '@/components/admin/crm/kpAstro/KundaliChart';
import BhavEditor, { type BhavAnalysisRow, normalizeBhavAnalysis } from '@/components/admin/crm/kpAstro/BhavEditor';
import { autoFillBhavRows } from '@/components/admin/crm/kpAstro/bhavAutoFill';
import type { SignificatorHouse, SignificatorPlanet } from '@/lib/kpAstro/significators';

interface MatchListItem { _id: string; label?: string; groomChartId?: { personName: string }; brideChartId?: { personName: string }; }

interface ChartRef {
  personName: string;
  ascendant?: { sign?: string };
  houses?: SignificatorHouse[];
  planets?: SignificatorPlanet[];
  chartStyle?: 'north' | 'south';
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

export default function KpMatchmakingWorkspacePage() {
  const token = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('matchId') || '';

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
      setGroomRows(autoFillBhavRows(groomRows, json.data.groomChartId?.houses || [], json.data.groomChartId?.planets || []));
      setBrideRows(autoFillBhavRows(brideRows, json.data.brideChartId?.houses || [], json.data.brideChartId?.planets || []));
      setCompatibilityNotes(json.data.compatibilityNotes || '');
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
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

      <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-500">Match:</label>
        <select
          value={matchId}
          onChange={(e) => router.push(e.target.value ? `/admin/crm/kp-astro/matchmaking/workspace?matchId=${e.target.value}` : '/admin/crm/kp-astro/matchmaking/workspace')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1 min-w-[200px]"
        >
          <option value="">— select a match —</option>
          {matchList.map((m) => <option key={m._id} value={m._id}>{m.label || `${m.groomChartId?.personName || '?'} ↔ ${m.brideChartId?.personName || '?'}`}</option>)}
        </select>
        <Link href="/admin/crm/kp-astro/matchmaking/data-entry" className="text-sm text-indigo-600 hover:underline whitespace-nowrap">+ New match</Link>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {!loading && match && (
        <>
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
              {(['planet', 'bhav'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChartDisplayMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${chartDisplayMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {mode === 'planet' ? 'Planet' : 'Bhav'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col items-center">
              <h2 className="font-semibold text-gray-900 text-sm mb-2">Groom — {match.groomChartId?.personName}</h2>
              <KundaliChart chartStyle={match.groomChartId?.chartStyle || 'north'} ascendantSign={match.groomChartId?.ascendant?.sign || ''} houses={match.groomChartId?.houses} planets={match.groomChartId?.planets} size={260} displayMode={chartDisplayMode} />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col items-center">
              <h2 className="font-semibold text-gray-900 text-sm mb-2">Bride — {match.brideChartId?.personName}</h2>
              <KundaliChart chartStyle={match.brideChartId?.chartStyle || 'north'} ascendantSign={match.brideChartId?.ascendant?.sign || ''} houses={match.brideChartId?.houses} planets={match.brideChartId?.planets} size={260} displayMode={chartDisplayMode} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <label className="text-xs font-medium text-gray-500">Compatibility Notes (guna milan score, manglik check, etc.)</label>
            <textarea value={compatibilityNotes} onChange={(e) => setCompatibilityNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div className="flex items-center justify-end sticky top-0 bg-gray-50/80 backdrop-blur py-1 z-10">
            {savedAt && <span className="text-xs text-emerald-600 mr-3">Saved {savedAt.toLocaleTimeString()}</span>}
            <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Groom's 12-Bhav Analysis</h2>
              <BhavEditor rows={groomRows} onChange={setGroomRows} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Bride's 12-Bhav Analysis</h2>
              <BhavEditor rows={brideRows} onChange={setBrideRows} />
            </div>
          </div>
        </>
      )}

      {!loading && !match && !matchId && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a match above to start working through both partners' bhavs.
        </div>
      )}
    </div>
  );
}
