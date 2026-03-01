'use client';

import { useEffect, useState } from 'react';
import {
  X, Bot, Phone, Loader2, CheckCircle, AlertTriangle,
  DollarSign, Users, Globe, Zap, Clock, ChevronDown,
} from 'lucide-react';

interface SavedTemplate {
  _id: string;
  key: string;
  name: string;
  description?: string;
  promptText: string;
  language: string;
  category: string;
  approvalStatus: string;
}

interface BulkCallModalProps {
  selectedCount: number;
  selectedLeadIds: string[];
  token: string;
  onClose: () => void;
  onComplete: () => void;
}

const COST_PER_MINUTE = 0.07; // avg $0.07/min
const AVG_CALL_DURATION = 2;  // 2 min avg per call

export default function BulkCallModal({ selectedCount, selectedLeadIds, token, onClose, onComplete }: BulkCallModalProps) {
  const [step, setStep] = useState<'config' | 'confirm' | 'progress' | 'done'>('config');

  // Config
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [purpose, setPurpose] = useState('welcome');
  const [customPrompt, setCustomPrompt] = useState('');
  const [batchName, setBatchName] = useState('');
  const [concurrency, setConcurrency] = useState(5);

  // Templates
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Progress
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Fetch templates on language change
  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const res = await fetch(`/api/admin/crm/calls/templates?language=${language}&category=outbound`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setTemplates((json.data?.templates || []).filter((t: SavedTemplate) => t.promptText?.trim()));
        }
      } catch { /* ignore */ }
      setTemplatesLoading(false);
    };
    fetchTemplates();
  }, [language, token]);

  // Auto-set purpose from selected template
  useEffect(() => {
    if (selectedTemplate) {
      const tmpl = templates.find(t => t._id === selectedTemplate);
      if (tmpl) {
        setCustomPrompt(tmpl.promptText);
        // Map template key to purpose
        const keyMap: Record<string, string> = {
          ob_welcome: 'welcome', ob_follow_up: 'follow_up', ob_answer: 'answer_questions',
          ob_workshop: 'workshop_reminder', ob_collect: 'collect_info', ob_payment: 'payment_reminder',
        };
        setPurpose(keyMap[tmpl.key] || 'custom');
      }
    }
  }, [selectedTemplate, templates]);

  const estimatedCost = (selectedCount * AVG_CALL_DURATION * COST_PER_MINUTE).toFixed(2);
  const estimatedTime = Math.ceil(selectedCount / concurrency) * AVG_CALL_DURATION;

  const handleStartBatch = async () => {
    setCalling(true);
    setError('');
    setStep('progress');

    try {
      const res = await fetch('/api/admin/crm/calls/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          purpose,
          language,
          customPrompt: customPrompt || undefined,
          name: batchName || undefined,
          maxConcurrency: concurrency,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error?.message || json.message || 'Batch call failed');
        setStep('done');
      } else {
        setResult(json.data);
        setStep('done');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setStep('done');
    }
    setCalling(false);
  };

  const langLabel = language === 'hi' ? 'Hindi' : 'English';

  const PURPOSE_OPTIONS = [
    { key: 'welcome', label: 'Welcome Call', icon: '🙏', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { key: 'follow_up', label: 'Follow-Up', icon: '📞', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'answer_questions', label: 'Answer Back', icon: '💬', color: 'bg-violet-50 text-violet-700 border-violet-200' },
    { key: 'workshop_reminder', label: 'Workshop', icon: '📅', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'collect_info', label: 'Collect Info', icon: '📋', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { key: 'payment_reminder', label: 'Payment', icon: '💳', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-base">Bulk Call Broadcast</h2>
            <p className="text-white/70 text-xs">{selectedCount} leads selected &middot; AI-powered batch calling</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Config Step */}
        {step === 'config' && (
          <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Cost Estimate Banner */}
            <div className="rounded-xl p-3 border border-indigo-100" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.04))' }}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-800">Estimated Cost</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {selectedCount} leads</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{estimatedTime} min total</span>
                    <span className="text-[10px] text-gray-400">${COST_PER_MINUTE}/min/call</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">${estimatedCost}</p>
                  <p className="text-[10px] text-gray-400">est. total</p>
                </div>
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Language</label>
              <div className="flex gap-2">
                {(['hi', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => { setLanguage(l); setSelectedTemplate(''); setCustomPrompt(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2 transition ${language === l
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    {l === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Call Purpose</label>
              <div className="grid grid-cols-3 gap-1.5">
                {PURPOSE_OPTIONS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setPurpose(p.key); setSelectedTemplate(''); setCustomPrompt(''); }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition ${purpose === p.key
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                      : `border-gray-100 ${p.color} hover:shadow-sm`
                    }`}
                  >
                    <span>{p.icon}</span> {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Script Template (Optional)</label>
              {templatesLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading templates...</div>
              ) : templates.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedTemplate}
                    onChange={e => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none appearance-none pr-8"
                  >
                    <option value="">Use default prompt</option>
                    {templates.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.name} {t.approvalStatus === 'approved' ? '✓' : t.approvalStatus === 'draft' ? '(draft)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-1">No approved templates for {langLabel}. Default prompts will be used.</p>
              )}
            </div>

            {/* Batch Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Batch Name (Optional)</label>
              <input
                type="text"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                placeholder={`${purpose} - ${langLabel} - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
              />
            </div>

            {/* Concurrency */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Concurrency <span className="text-gray-400 font-normal normal-case">(simultaneous calls)</span>
              </label>
              <div className="flex gap-1.5">
                {[1, 3, 5, 10, 15].map(n => (
                  <button
                    key={n}
                    onClick={() => setConcurrency(n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition ${concurrency === n
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt Preview */}
            {customPrompt && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Script Preview</label>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 max-h-32 overflow-y-auto">
                  <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-6">{customPrompt.slice(0, 500)}{customPrompt.length > 500 ? '...' : ''}</p>
                </div>
              </div>
            )}

            {/* Action */}
            <button
              onClick={() => setStep('confirm')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
            >
              <Zap className="h-4 w-4" />
              Review & Send — {selectedCount} calls (~${estimatedCost})
            </button>
          </div>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <div className="px-5 py-4 space-y-4">
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Confirm Batch Call</p>
                  <p className="text-xs text-amber-600 mt-1">
                    This will start <strong>{selectedCount}</strong> AI calls in <strong>{langLabel}</strong> with purpose <strong>&quot;{purpose.replace(/_/g, ' ')}&quot;</strong>.
                    Estimated cost: <strong>${estimatedCost}</strong>. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Leads</p>
                <p className="text-lg font-bold text-gray-800">{selectedCount}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Est. Cost</p>
                <p className="text-lg font-bold text-indigo-600">${estimatedCost}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Language</p>
                <p className="text-lg font-bold text-gray-800">{langLabel}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Concurrency</p>
                <p className="text-lg font-bold text-gray-800">{concurrency} calls</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('config')} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                Back
              </button>
              <button
                onClick={handleStartBatch}
                disabled={calling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}
              >
                {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                {calling ? 'Starting...' : 'Start Batch Now'}
              </button>
            </div>
          </div>
        )}

        {/* Progress Step */}
        {step === 'progress' && (
          <div className="px-5 py-8 text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm font-semibold text-gray-700">Setting up batch call...</p>
            <p className="text-xs text-gray-400">Queuing {selectedCount} calls with Retell AI</p>
          </div>
        )}

        {/* Done Step */}
        {step === 'done' && (
          <div className="px-5 py-6 space-y-4">
            {error ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-sm font-semibold text-red-700">Batch Call Failed</p>
                <p className="text-xs text-red-500">{error}</p>
              </div>
            ) : result ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-semibold text-green-700">Batch Call Started!</p>
                <p className="text-xs text-gray-500">{result.message}</p>

                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div className="rounded-xl bg-green-50 p-3 border border-green-100">
                    <p className="text-[10px] text-green-500 uppercase font-semibold">Queued</p>
                    <p className="text-lg font-bold text-green-700">{result.totalQueued}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3 border border-indigo-100">
                    <p className="text-[10px] text-indigo-500 uppercase font-semibold">Est. Cost</p>
                    <p className="text-lg font-bold text-indigo-600">{result.estimatedCost}</p>
                  </div>
                  {result.skipped > 0 && (
                    <div className="rounded-xl bg-amber-50 p-3 border border-amber-100 col-span-2">
                      <p className="text-[10px] text-amber-500 uppercase font-semibold">Skipped (no phone)</p>
                      <p className="text-lg font-bold text-amber-600">{result.skipped}</p>
                    </div>
                  )}
                </div>

                {result.batchId && (
                  <p className="text-[10px] text-gray-400 mt-2">Batch ID: {result.batchId}</p>
                )}
              </div>
            ) : null}

            <button
              onClick={() => { onComplete(); onClose(); }}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
