'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Loader2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import { KP_LANGUAGES, languageHasFullFontSupportClient } from '@/lib/kpAstro/languages';

type Kind = 'birth' | 'horary' | 'matchmaking';

interface ListItem { _id: string; label: string; }

const KIND_OPTIONS: Array<{ value: Kind; label: string; endpoint: string }> = [
  { value: 'birth', label: 'Birth Chart', endpoint: '/api/admin/crm/kp-astro/charts' },
  { value: 'horary', label: 'Horary Question', endpoint: '/api/admin/crm/kp-astro/horary' },
  { value: 'matchmaking', label: 'Matchmaking', endpoint: '/api/admin/crm/kp-astro/matchmaking' },
];

export default function KpExportPage() {
  const token = useAuth();
  const [kind, setKind] = useState<Kind>('birth');
  const [items, setItems] = useState<ListItem[]>([]);
  const [recordId, setRecordId] = useState('');
  const [language, setLanguage] = useState('hi');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const opt = KIND_OPTIONS.find((o) => o.value === kind)!;
    fetch(opt.endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => {
        const data = Array.isArray(j.data) ? j.data : [];
        const mapped: ListItem[] = data.map((d: any) => ({
          _id: d._id,
          label: kind === 'birth' ? d.personName : kind === 'horary' ? `#${d.horaryNumber} — ${d.questionText?.slice(0, 40)}` : (d.label || `${d.groomChartId?.personName || '?'} ↔ ${d.brideChartId?.personName || '?'}`),
        }));
        setItems(mapped);
        setRecordId('');
      })
      .catch(() => setItems([]));
  }, [token, kind]);

  const handleDownload = async () => {
    if (!token || !recordId) return;
    setDownloading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/export?kind=${kind}&id=${recordId}&language=${language}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to export PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kp-astro-${kind}-${recordId}-${language}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export PDF');
    } finally {
      setDownloading(false);
    }
  };

  const fullFontSupport = languageHasFullFontSupportClient(language);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><FileText className="h-6 w-6 text-indigo-500" />Export Prediction (A4 PDF)</span>}
        subtitle="Downloads the latest generated prediction for the selected record and language"
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Record</label>
          <select value={recordId} onChange={(e) => setRecordId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">— select —</option>
            {items.map((i) => <option key={i._id} value={i._id}>{i.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {KP_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {!fullFontSupport && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>This script's font file isn't bundled yet — the PDF may show missing glyphs for this language. Hindi, Marathi, and English render at full quality.</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || !recordId}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
        <p className="text-xs text-gray-400">Make sure you've generated a prediction in this language first on the Final Prediction page — export only reads existing generated text, it does not generate new text.</p>
      </div>
    </div>
  );
}
