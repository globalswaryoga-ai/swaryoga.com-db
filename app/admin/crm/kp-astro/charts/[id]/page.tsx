'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Send, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import { KP_LANGUAGES } from '@/lib/kpAstro/languages';

interface ChartReport {
  language: string;
  text: string;
  generatedAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface Chart {
  _id: string;
  personName: string;
  gender?: string;
  dob?: string;
  birthTime?: string;
  birthPlace?: string;
  houses?: Array<{ house: number; sign?: string; subLord?: string }>;
  planets?: Array<{ planet: string; sign?: string; house?: number }>;
  mahadashas?: Array<{ planet: string; startDate: string; endDate: string }>;
  doshas?: { kalsarp?: boolean; pitru?: boolean; stri?: boolean; otherNotes?: string };
  reports?: ChartReport[];
  chatHistory?: ChatMessage[];
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

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  const latestReportForLanguage = chart?.reports?.filter((r) => r.language === language).slice(-1)[0];

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
      setChart((prev) => (prev ? { ...prev, reports: [...(prev.reports || []), { language, text: json.data.text, generatedAt: json.data.generatedAt }] } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
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
