'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Clock3, Download, Sparkles, Send, Loader2, RefreshCw, Pencil, X, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import { KP_LANGUAGES } from '@/lib/kpAstro/languages';

const PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

interface ChartReport {
  language: string;
  reportType?: 'general' | 'final' | 'timeline' | 'matchmaking' | 'horary';
  text: string;
  generatedAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface ChartHouse {
  house: number;
  sign?: string;
  signLord?: string;
  star?: string;
  starLord?: string;
  subLord?: string;
  degree?: string;
}

interface ChartPlanet {
  planet: string;
  sign?: string;
  star?: string;
  subLord?: string;
  house?: number;
  degree?: string;
  retrograde?: boolean;
  combust?: boolean;
}

interface Chart {
  _id: string;
  personName: string;
  gender?: string;
  dob?: string;
  birthTime?: string;
  birthPlace?: string;
  ascendant?: { sign?: string; degree?: string };
  houses?: ChartHouse[];
  planets?: ChartPlanet[];
  mahadashas?: Array<{ planet: string; startDate: string; endDate: string }>;
  doshas?: { kalsarp?: boolean; pitru?: boolean; stri?: boolean; otherNotes?: string };
  reports?: ChartReport[];
  chatHistory?: ChatMessage[];
}

const emptyHouses = (): ChartHouse[] =>
  Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: '', signLord: '', star: '', starLord: '', subLord: '', degree: '' }));

const emptyPlanets = (): ChartPlanet[] =>
  PLANET_NAMES.map((planet) => ({ planet, sign: '', star: '', subLord: '', house: undefined, degree: '', retrograde: false, combust: false }));

function fillHouses(houses: ChartHouse[] | undefined): ChartHouse[] {
  const base = emptyHouses();
  return base.map((h) => ({ ...h, ...(houses?.find((x) => x.house === h.house) || {}) }));
}

function fillPlanets(planets: ChartPlanet[] | undefined): ChartPlanet[] {
  const base = emptyPlanets();
  return base.map((p) => ({ ...p, ...(planets?.find((x) => x.planet === p.planet) || {}) }));
}

export default function KpHoroscopeChartDetailPage() {
  const token = useAuth();
  const params = useParams();
  const id = String(params?.id || '');

  const [chart, setChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<string>('hi');
  const [generating, setGenerating] = useState(false);
  const [generatingTimeline, setGeneratingTimeline] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [editing, setEditing] = useState(false);
  const [editHouses, setEditHouses] = useState<ChartHouse[]>(emptyHouses());
  const [editPlanets, setEditPlanets] = useState<ChartPlanet[]>(emptyPlanets());
  const [editAscendantSign, setEditAscendantSign] = useState('');
  const [editAscendantDegree, setEditAscendantDegree] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchChart = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load chart');
      setChart(json.data);
      setChatMessages(Array.isArray(json.data?.chatHistory) ? json.data.chatHistory : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chart');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { fetchChart(); }, [fetchChart]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const latestReportForLanguage = chart?.reports
    ?.filter((r) => r.language === language)
    .filter((r) => !r.reportType || r.reportType === 'general')
    .slice(-1)[0];
  const latestTimelineForLanguage = chart?.reports
    ?.filter((r) => r.language === language && r.reportType === 'timeline')
    .slice(-1)[0];

  const startEditing = () => {
    setEditHouses(fillHouses(chart?.houses));
    setEditPlanets(fillPlanets(chart?.planets));
    setEditAscendantSign(chart?.ascendant?.sign || '');
    setEditAscendantDegree(chart?.ascendant?.degree || '');
    setEditError('');
    setEditing(true);
  };

  const updateEditHouse = (idx: number, field: keyof ChartHouse, value: string) => {
    setEditHouses((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  };
  const updateEditPlanet = (idx: number, field: keyof ChartPlanet, value: string | boolean) => {
    setEditPlanets((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const handleDelete = async () => {
    if (!token || !id) return;
    if (!window.confirm('Delete this chart permanently?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      window.location.href = '/admin/crm/kp-astro/charts';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete chart');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!token || !id) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ascendant: (editAscendantSign || editAscendantDegree) ? { sign: editAscendantSign, degree: editAscendantDegree } : undefined,
          houses: editHouses.filter((h) => h.sign || h.subLord),
          planets: editPlanets
            .filter((p) => p.sign || p.subLord)
            .map((p) => ({ ...p, house: p.house ? Number(p.house) : undefined })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save chart');
      setChart(json.data);
      setEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save chart');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleGenerate = async () => {
    if (!token || !id) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate report');
      setChart((prev) => (prev ? { ...prev, reports: [...(prev.reports || []), { language, reportType: 'general', text: json.data.text, generatedAt: json.data.generatedAt }] } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateTimeline = async () => {
    if (!token || !id) return;
    setGeneratingTimeline(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${id}/timeline-prediction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate age timeline');
      setChart((prev) => (prev ? {
        ...prev,
        reports: [...(prev.reports || []), { language, reportType: 'timeline', text: json.data.text, generatedAt: json.data.generatedAt }],
      } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate age timeline');
    } finally {
      setGeneratingTimeline(false);
    }
  };

  const handleSendChat = async () => {
    if (!token || !id || !chatInput.trim()) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setChatSending(true);
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${id}/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: chatMessages, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Chat failed');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: json.reply }]);
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Chat failed'}` }]);
    } finally {
      setChatSending(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  if (error && !chart) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!chart) return null;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader theme="light"
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            {chart.personName}
          </span>
        }
        subtitle={[chart.gender, chart.dob ? new Date(chart.dob).toLocaleDateString('en-IN') : null, chart.birthPlace].filter(Boolean).join(' · ') || 'Horoscope chart'}
        action={<Link href="/admin/crm/kp-astro/charts" className="text-sm text-indigo-600 hover:underline">← All charts</Link>}
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">12 Bhav (Houses) &amp; Planets</h2>
          {!editing ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={startEditing} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditing(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
                <X className="h-4 w-4" /> Cancel
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={savingEdit} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </button>
            </div>
          )}
        </div>
        {editError && <p className="text-xs text-red-600">{editError}</p>}

        {editing ? (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={editAscendantSign} onChange={(e) => setEditAscendantSign(e.target.value)} placeholder="Ascendant (Lagna) Sign" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input value={editAscendantDegree} onChange={(e) => setEditAscendantDegree(e.target.value)} placeholder="Ascendant Degree" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="p-1">House</th><th className="p-1">Sign</th><th className="p-1">Sign Lord</th>
                    <th className="p-1">Star</th><th className="p-1">Star Lord</th><th className="p-1">Sub Lord</th><th className="p-1">Degree</th>
                  </tr>
                </thead>
                <tbody>
                  {editHouses.map((h, idx) => (
                    <tr key={h.house}>
                      <td className="p-1 font-semibold text-gray-700">{h.house}</td>
                      {(['sign', 'signLord', 'star', 'starLord', 'subLord', 'degree'] as const).map((field) => (
                        <td key={field} className="p-1">
                          <input value={h[field] || ''} onChange={(e) => updateEditHouse(idx, field, e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="p-1">Planet</th><th className="p-1">Sign</th><th className="p-1">Star</th>
                    <th className="p-1">Sub Lord</th><th className="p-1">House</th><th className="p-1">Degree</th>
                    <th className="p-1">Retro</th><th className="p-1">Combust</th>
                  </tr>
                </thead>
                <tbody>
                  {editPlanets.map((p, idx) => (
                    <tr key={p.planet}>
                      <td className="p-1 font-semibold text-gray-700">{p.planet}</td>
                      {(['sign', 'star', 'subLord', 'house', 'degree'] as const).map((field) => (
                        <td key={field} className="p-1">
                          <input value={(p as any)[field] ?? ''} onChange={(e) => updateEditPlanet(idx, field, e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1" />
                        </td>
                      ))}
                      <td className="p-1"><input type="checkbox" checked={!!p.retrograde} onChange={(e) => updateEditPlanet(idx, 'retrograde', e.target.checked)} /></td>
                      <td className="p-1"><input type="checkbox" checked={!!p.combust} onChange={(e) => updateEditPlanet(idx, 'combust', e.target.checked)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : !chart.houses?.length && !chart.planets?.length ? (
          <p className="text-sm text-gray-400">No house/planet data yet. Click "Edit" to enter it.</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-900">Generated Reading</h2>
          <div className="flex items-center gap-2">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {KP_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {latestReportForLanguage ? 'Regenerate' : 'Generate'}
            </button>
            {latestReportForLanguage && (
              <a
                href={`/api/admin/crm/kp-astro/export?kind=birth&id=${id}&language=${language}&reportType=general`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                PDF
              </a>
            )}
          </div>
        </div>

        {latestReportForLanguage ? (
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {latestReportForLanguage.text}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No reading generated yet in {KP_LANGUAGES.find((l) => l.code === language)?.label}. Click "Generate".</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-indigo-500" />
              Age Timeline Prediction
            </h2>
            <p className="text-xs text-gray-500 mt-1">Generates age 5, 10, 15...80 using saved Mahadasha and bhav analysis.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateTimeline}
              disabled={generatingTimeline}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {generatingTimeline ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {latestTimelineForLanguage ? 'Regenerate Timeline' : 'Generate Timeline'}
            </button>
            {latestTimelineForLanguage && (
              <a
                href={`/api/admin/crm/kp-astro/export?kind=birth&id=${id}&language=${language}&reportType=timeline`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                PDF
              </a>
            )}
          </div>
        </div>

        {latestTimelineForLanguage ? (
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {latestTimelineForLanguage.text}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No age timeline generated yet in {KP_LANGUAGES.find((l) => l.code === language)?.label}.</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Ask the Astrology Assistant</h2>
        <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-100 rounded-lg p-3 bg-gray-50">
          {chatMessages.length === 0 && <p className="text-sm text-gray-400">Ask a follow-up question about this chart — answers in {KP_LANGUAGES.find((l) => l.code === language)?.label} by default.</p>}
          {chatMessages.map((m, i) => (
            <div key={i} className={`text-sm rounded-lg p-3 max-w-[85%] ${m.role === 'user' ? 'bg-indigo-600 text-white ml-auto' : 'bg-white border border-gray-200 text-gray-800'}`}>
              {m.content}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="flex items-center gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !chatSending) handleSendChat(); }}
            placeholder="e.g. Why is the 7th house Sub Lord significant here?"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSendChat}
            disabled={chatSending || !chatInput.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
