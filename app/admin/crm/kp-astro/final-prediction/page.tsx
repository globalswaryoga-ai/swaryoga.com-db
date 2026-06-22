'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import type { BhavAnalysisRow } from '@/components/admin/crm/kpAstro/BhavEditor';
import { KP_LANGUAGES } from '@/lib/kpAstro/languages';

interface ChartListItem { _id: string; personName: string; updatedAt: string; }
interface HoraryListItem { _id: string; questionText: string; horaryNumber: number; updatedAt: string; }

interface ChartReport { language: string; reportType?: string; text: string; generatedAt: string; }

interface ChartDetail {
  _id: string;
  personName?: string;
  questionText?: string;
  horaryNumber?: number;
  dob?: string;
  gender?: string;
  bhavAnalysis?: BhavAnalysisRow[];
  lifeStageNotes?: string;
  reports?: ChartReport[];
}


function currentAge(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function KpFinalPredictionPage() {
  const token = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chartId = searchParams.get('chartId') || '';
  const horaryChartId = searchParams.get('horaryChartId') || '';
  const isHorary = !!horaryChartId;
  const activeId = isHorary ? horaryChartId : chartId;

  const [chartList, setChartList] = useState<ChartListItem[]>([]);
  const [horaryList, setHoraryList] = useState<HoraryListItem[]>([]);
  const [chart, setChart] = useState<ChartDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<string>('hi');
  const [lifeStageNotes, setLifeStageNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/kp-astro/charts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((j) => setChartList(Array.isArray(j.data) ? j.data : [])).catch(() => {});
    fetch('/api/admin/crm/kp-astro/horary', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((j) => setHoraryList(Array.isArray(j.data) ? j.data : [])).catch(() => {});
  }, [token]);

  const fetchChart = useCallback(async () => {
    if (!token || !activeId) { setChart(null); return; }
    setLoading(true);
    setError('');
    try {
      const base = isHorary ? '/api/admin/crm/kp-astro/horary' : '/api/admin/crm/kp-astro/charts';
      const res = await fetch(`${base}/${activeId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load chart');
      setChart(json.data);
      setLifeStageNotes(json.data.lifeStageNotes || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chart');
    } finally {
      setLoading(false);
    }
  }, [token, activeId, isHorary]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  const bhavRows = chart?.bhavAnalysis || [];
  const hasBhavContent = (b: any) =>
    b.subLord || b.positiveNotes || b.negativeNotes || b.dashaNotes || b.freeNotes ||
    b.subLordAbcdPlanets || b.subLordKaryeshBhav || b.subLordRahuKetuConnection ||
    b.subLordDrishti || b.subLordConjunction || b.dashaChain ||
    b.customMatters?.length || b.drishtiPlanets?.length || b.connectionPlanets?.length;
  const orderedBhavs = bhavRows
    .filter((b) => b.includeInPrediction !== false)
    .filter(hasBhavContent)
    .sort((a, b) => (a.predictionOrder || 0) - (b.predictionOrder || 0) || a.house - b.house);
  const hasAnyContent = orderedBhavs.length > 0;
  const age = currentAge(chart?.dob);

  const handleSaveNotes = async () => {
    if (!token || !chartId || isHorary) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/admin/crm/kp-astro/charts/${chartId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifeStageNotes }),
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleGenerate = async () => {
    if (!token || !activeId) return;
    setGenerating(true);
    setError('');
    try {
      if (!isHorary) await handleSaveNotes();
      const base = isHorary ? '/api/admin/crm/kp-astro/horary' : '/api/admin/crm/kp-astro/charts';
      const res = await fetch(`${base}/${activeId}/final-prediction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate');
      setChart((prev) => (prev ? { ...prev, reports: [...(prev.reports || []), { language, reportType: isHorary ? 'horary' : 'final', text: json.data.text, generatedAt: json.data.generatedAt }] } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate final prediction');
    } finally {
      setGenerating(false);
    }
  };

  const latestReport = chart?.reports
    ?.filter((r) => r.language === language)
    .filter((r) => (r.reportType || (isHorary ? 'horary' : 'final')) === (isHorary ? 'horary' : 'final'))
    .slice(-1)[0];

  const handlePickBirth = (id: string) => router.push(id ? `/admin/crm/kp-astro/final-prediction?chartId=${id}` : '/admin/crm/kp-astro/final-prediction');
  const handlePickHorary = (id: string) => router.push(id ? `/admin/crm/kp-astro/final-prediction?horaryChartId=${id}` : '/admin/crm/kp-astro/final-prediction');

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            Final Prediction
          </span>
        }
        subtitle="Reads from the astrologer's saved bhav analysis only — finish the Workspace first"
        action={
          activeId && (
            <Link href={isHorary ? `/admin/crm/kp-astro/horary-workspace?chartId=${activeId}` : `/admin/crm/kp-astro/workspace?chartId=${activeId}`} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Workspace
            </Link>
          )
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Birth Chart</label>
          <select value={!isHorary ? chartId : ''} onChange={(e) => handlePickBirth(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">— select —</option>
            {chartList.map((c) => <option key={c._id} value={c._id}>{c.personName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Horary Question</label>
          <select value={isHorary ? horaryChartId : ''} onChange={(e) => handlePickHorary(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">— select —</option>
            {horaryList.map((c) => <option key={c._id} value={c._id}>#{c.horaryNumber} — {c.questionText.slice(0, 40)}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {!loading && chart && (
        <>
          {!isHorary ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <h2 className="font-semibold text-gray-900 text-sm">{chart.personName}{age !== null ? <span className="text-gray-400"> — {age} years old now</span> : null}</h2>
              <div>
                <label className="text-xs font-medium text-gray-500">Current Life Facts (already married? settled abroad? etc. — the AI will not contradict these)</label>
                <textarea
                  value={lifeStageNotes}
                  onChange={(e) => setLifeStageNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  rows={2}
                  placeholder="e.g. Already married since 2018, no children yet, working in IT in Pune"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {savingNotes && <span className="text-xs text-gray-400">Saving…</span>}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold text-gray-900 text-sm">#{chart.horaryNumber} — {chart.questionText}</h2>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm">{isHorary ? 'Relevant House Analysis' : "Prediction Points (in astrologer's order)"}</h2>
            {!hasAnyContent ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                No bhav analysis saved yet.{' '}
                <Link href={isHorary ? `/admin/crm/kp-astro/horary-workspace?chartId=${activeId}` : `/admin/crm/kp-astro/workspace?chartId=${activeId}`} className="underline font-medium">Go to the {isHorary ? 'Horary' : 'Astrologer'} Workspace</Link>{' '}
                and work through the houses first — the final {isHorary ? 'judgment' : 'prediction'} is generated only from what you save there.
              </div>
            ) : (
              <ol className="space-y-2 list-decimal list-inside">
                {orderedBhavs.map((b) => (
                  <li key={b.house} className="text-sm text-gray-700">
                    <span className="font-medium">House {b.house}</span>
                    {b.subLord ? <span className="text-gray-400"> (Sub: {b.subLord})</span> : null}
                    {b.positiveNotes ? <span className="text-emerald-600"> — {b.positiveNotes}</span> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-semibold text-gray-900">Generated {isHorary ? 'Judgment' : 'Final Prediction'}</h2>
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
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {latestReport.text}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nothing generated yet in {KP_LANGUAGES.find((l) => l.code === language)?.label}.</p>
            )}
          </div>
        </>
      )}

      {!loading && !chart && !activeId && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a birth chart or horary question above.
        </div>
      )}
    </div>
  );
}
