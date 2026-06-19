'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import { KP_LANGUAGES } from '@/lib/kpAstro/languages';

interface MatchListItem { _id: string; label?: string; groomChartId?: { personName: string }; brideChartId?: { personName: string }; }

interface MatchReport { language: string; text: string; generatedAt: string; }

interface MatchDetail {
  _id: string;
  label?: string;
  groomChartId?: { personName: string };
  brideChartId?: { personName: string };
  groomBhavAnalysis?: any[];
  brideBhavAnalysis?: any[];
  compatibilityNotes?: string;
  reports?: MatchReport[];
}


function hasContent(b: any) {
  return b.subLord || b.positiveNotes || b.negativeNotes || b.dashaNotes || b.freeNotes ||
    b.subLordAbcdPlanets || b.subLordKaryeshBhav || b.subLordRahuKetuConnection ||
    b.subLordDrishti || b.subLordConjunction || b.dashaChain ||
    b.customMatters?.length || b.drishtiPlanets?.length || b.connectionPlanets?.length;
}

export default function KpMatchmakingFinalPredictionPage() {
  const token = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('matchId') || '';

  const [matchList, setMatchList] = useState<MatchListItem[]>([]);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<string>('hi');
  const [generating, setGenerating] = useState(false);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [token, matchId]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  const groomBhavs = (match?.groomBhavAnalysis || []).filter((b) => b.includeInPrediction !== false && hasContent(b));
  const brideBhavs = (match?.brideBhavAnalysis || []).filter((b) => b.includeInPrediction !== false && hasContent(b));
  const hasAnyContent = groomBhavs.length > 0 || brideBhavs.length > 0;

  const handleGenerate = async () => {
    if (!token || !matchId) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/matchmaking/${matchId}/final-prediction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate');
      setMatch((prev) => (prev ? { ...prev, reports: [...(prev.reports || []), { language, text: json.data.text, generatedAt: json.data.generatedAt }] } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate prediction');
    } finally {
      setGenerating(false);
    }
  };

  const latestReport = match?.reports?.filter((r) => r.language === language).slice(-1)[0];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Heart className="h-6 w-6 text-indigo-500" />Matchmaking Final Prediction</span>}
        subtitle="Reads from both partners' saved bhav analysis only"
        action={
          matchId && (
            <Link href={`/admin/crm/kp-astro/matchmaking/workspace?matchId=${matchId}`} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Workspace
            </Link>
          )
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-500">Match:</label>
        <select
          value={matchId}
          onChange={(e) => router.push(e.target.value ? `/admin/crm/kp-astro/matchmaking/final-prediction?matchId=${e.target.value}` : '/admin/crm/kp-astro/matchmaking/final-prediction')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1 min-w-[200px]"
        >
          <option value="">— select a match —</option>
          {matchList.map((m) => <option key={m._id} value={m._id}>{m.label || `${m.groomChartId?.personName || '?'} ↔ ${m.brideChartId?.personName || '?'}`}</option>)}
        </select>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {!loading && match && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
            <h2 className="font-semibold text-gray-900 text-sm">{match.groomChartId?.personName} ↔ {match.brideChartId?.personName}</h2>
            {match.compatibilityNotes && <p className="text-xs text-gray-500">{match.compatibilityNotes}</p>}
            {!hasAnyContent && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mt-2">
                No bhav analysis saved for either partner yet.{' '}
                <Link href={`/admin/crm/kp-astro/matchmaking/workspace?matchId=${matchId}`} className="underline font-medium">Go to the Matchmaking Workspace</Link>.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-semibold text-gray-900">Generated Prediction</h2>
              <div className="flex items-center gap-2">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {KP_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !hasAnyContent}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {latestReport ? 'Regenerate' : 'Generate'}
                </button>
              </div>
            </div>

            {latestReport ? (
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{latestReport.text}</div>
            ) : (
              <p className="text-sm text-gray-400">Nothing generated yet in {KP_LANGUAGES.find((l) => l.code === language)?.label}.</p>
            )}
          </div>
        </>
      )}

      {!loading && !match && !matchId && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a match above.
        </div>
      )}
    </div>
  );
}
