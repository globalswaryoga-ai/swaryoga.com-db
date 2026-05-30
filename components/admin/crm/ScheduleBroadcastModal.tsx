'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  X, Search, Calendar, Loader2, CheckCircle, AlertTriangle,
  Phone, Users, DollarSign, ChevronDown, CalendarClock, Check,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const PURPOSE_OPTIONS = [
  { key: 'welcome', label: 'Welcome Call', icon: '🙏' },
  { key: 'follow_up', label: 'Follow-Up', icon: '📞' },
  { key: 'answer_questions', label: 'Answer Back', icon: '💬' },
  { key: 'workshop_reminder', label: 'Workshop', icon: '📅' },
  { key: 'collect_info', label: 'Collect Info', icon: '📋' },
  { key: 'payment_reminder', label: 'Payment', icon: '💳' },
];

const COST_PER_MINUTE = 0.07;
const AVG_CALL_DURATION = 2;

interface SavedTemplate {
  _id: string;
  key: string;
  name: string;
  promptText?: string;
  language: string;
  category: string;
}

interface Lead {
  _id: string;
  name: string;
  displayName?: string;
  phoneNumber: string;
  funnelStage?: string;
}

interface Props {
  token: string;
  onClose: () => void;
  onComplete: () => void;
}

function getMinDate() {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString().split('T')[0];
}

function getMinTime(date: string) {
  const now = new Date(Date.now() + 5 * 60 * 1000);
  const today = now.toISOString().split('T')[0];
  if (date === today) return now.toTimeString().slice(0, 5);
  return '00:00';
}

export default function ScheduleBroadcastModal({ token, onClose, onComplete }: Props) {
  const [step, setStep] = useState<'leads' | 'config' | 'schedule' | 'confirm' | 'result'>('leads');

  // All leads
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Config
  const [language, setLanguage] = useState('hi');
  const [purpose, setPurpose] = useState('welcome');
  const [batchName, setBatchName] = useState('');
  const [concurrency, setConcurrency] = useState(5);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Schedule
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sendNow, setSendNow] = useState(false);

  // Result
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Load all leads on mount
  useEffect(() => {
    (async () => {
      setLeadsLoading(true);
      try {
        const res = await fetch('/api/admin/crm/funnel/leads?limit=500&all=1', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setAllLeads(json.data?.leads || []);
        }
      } catch { /* ignore */ }
      setLeadsLoading(false);
    })();
  }, [token]);

  // Fetch templates when language changes
  useEffect(() => {
    (async () => {
      setTemplatesLoading(true);
      setSelectedTemplateId('');
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
    })();
  }, [language, token]);

  // Client-side filter
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return allLeads;
    const q = searchQuery.toLowerCase();
    return allLeads.filter(l =>
      (l.displayName || l.name || '').toLowerCase().includes(q) ||
      (l.phoneNumber || '').includes(q) ||
      (l.funnelStage || '').toLowerCase().includes(q)
    );
  }, [allLeads, searchQuery]);

  const toggleLead = (lead: Lead) => {
    const next = new Set(selectedLeadIds);
    if (next.has(lead._id)) next.delete(lead._id);
    else next.add(lead._id);
    setSelectedLeadIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0) {
      // Deselect all visible
      const next = new Set(selectedLeadIds);
      filteredLeads.forEach(l => next.delete(l._id));
      setSelectedLeadIds(next);
    } else {
      // Select all visible
      const next = new Set(selectedLeadIds);
      filteredLeads.forEach(l => next.add(l._id));
      setSelectedLeadIds(next);
    }
  };

  const allVisibleSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.has(l._id));

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t._id === id);
    if (tmpl) {
      const keyMap: Record<string, string> = {
        ob_welcome: 'welcome', ob_follow_up: 'follow_up', ob_answer: 'answer_questions',
        ob_workshop: 'workshop_reminder', ob_collect: 'collect_info', ob_payment: 'payment_reminder',
      };
      setPurpose(keyMap[tmpl.key] || 'custom');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const scheduledAt = !sendNow && scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : undefined;

      const res = await fetch('/api/admin/crm/calls/broadcasts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeadIds),
          templateId: selectedTemplateId,
          scheduledAt,
          language,
          purpose,
          batchName: batchName || undefined,
          concurrency,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error?.message || json.message || 'Failed to schedule broadcast');
      } else {
        setResult(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
    setSubmitting(false);
    setStep('result');
  };

  const langLabel = LANGUAGES.find(l => l.code === language)?.label || language;
  const estimatedCost = (selectedLeadIds.size * AVG_CALL_DURATION * COST_PER_MINUTE).toFixed(2);

  const STEPS = ['leads', 'config', 'schedule', 'confirm'];
  const STEP_LABELS = ['Leads', 'Template', 'Schedule', 'Confirm'];
  const currentIdx = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366F1, #10B981)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-base">Schedule Broadcast</h2>
            <p className="text-white/70 text-xs">Select leads, template &amp; schedule time</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'result' && (
          <div className="flex items-center gap-1 px-5 py-2.5 border-b border-gray-100 flex-shrink-0">
            {STEPS.map((s, i) => {
              const isActive = step === s;
              const isDone = currentIdx > i;
              return (
                <div key={s} className="flex items-center gap-1">
                  {i > 0 && <div className={`w-5 h-px ${isDone ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition ${isActive ? 'bg-indigo-100 text-indigo-700' : isDone ? 'text-indigo-400' : 'text-gray-400'}`}>
                    {isDone ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <span
                        className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] font-bold"
                        style={{ borderColor: isActive ? '#6366F1' : '#D1D5DB', color: isActive ? '#6366F1' : '#9CA3AF' }}
                      >
                        {i + 1}
                      </span>
                    )}
                    {STEP_LABELS[i]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Step 1: Lead Selection ── */}
          {step === 'leads' && (
            <div className="flex flex-col h-full">
              {/* Search + select all bar */}
              <div className="px-4 pt-3 pb-2 space-y-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone or stage..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                  />
                </div>

                {/* Select all row */}
                {!leadsLoading && allLeads.length > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <label
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={toggleSelectAll}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition ${allVisibleSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                        {allVisibleSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-gray-600">
                        Select all {filteredLeads.length > 0 ? `(${filteredLeads.length})` : ''}
                      </span>
                    </label>
                    {selectedLeadIds.size > 0 && (
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {selectedLeadIds.size} selected
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Leads list */}
              <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0" style={{ maxHeight: '340px' }}>
                {leadsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                    <span className="text-sm">Loading leads...</span>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">
                    {searchQuery ? 'No leads match your search.' : 'No leads found.'}
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    {filteredLeads.map((lead, idx) => {
                      const isSelected = selectedLeadIds.has(lead._id);
                      return (
                        <div
                          key={lead._id}
                          onClick={() => toggleLead(lead)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition ${idx !== filteredLeads.length - 1 ? 'border-b border-gray-50' : ''} ${isSelected ? 'bg-indigo-50 hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{lead.displayName || lead.name}</p>
                            <p className="text-xs text-gray-400">{lead.phoneNumber || 'No phone'}{lead.funnelStage ? ` · ${lead.funnelStage}` : ''}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Continue button */}
              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setStep('config')}
                  disabled={selectedLeadIds.size === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                >
                  <Users className="h-4 w-4" />
                  Continue with {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Template & Config ── */}
          {step === 'config' && (
            <div className="px-5 py-4 space-y-4">
              {/* Cost estimate */}
              <div className="rounded-xl p-3 border border-indigo-100" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.04))' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-800">Est. Cost</span>
                    <span className="text-xs text-gray-400">{selectedLeadIds.size} leads × 2 min avg</span>
                  </div>
                  <span className="text-xl font-bold text-indigo-600">${estimatedCost}</span>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Language</label>
                <div className="flex gap-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${language === l.code ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  AI Calling Template <span className="text-red-400">*</span>
                </label>
                {templatesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading templates...
                  </div>
                ) : templates.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedTemplateId}
                      onChange={e => handleTemplateChange(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none appearance-none pr-8"
                    >
                      <option value="">Select a template...</option>
                      {templates.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
                    No {langLabel} templates found. Please create one in Templates first.
                  </p>
                )}
              </div>

              {/* Purpose */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Call Purpose</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PURPOSE_OPTIONS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPurpose(p.key)}
                      className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium border transition ${purpose === p.key ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span>{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Batch Name (Optional)</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  placeholder={`${purpose} · ${langLabel} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
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
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition ${concurrency === n ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep('leads')} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                  Back
                </button>
                <button
                  onClick={() => setStep('schedule')}
                  disabled={!selectedTemplateId}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                >
                  Next: Schedule
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Schedule ── */}
          {step === 'schedule' && (
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-indigo-500" />
                  <p className="text-sm font-semibold text-indigo-800">When to run this broadcast?</p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setSendNow(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${sendNow ? 'bg-indigo-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${sendNow ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-800">Send immediately</span>
                </label>

                {sendNow ? (
                  <p className="text-xs text-indigo-700 bg-white rounded-lg px-3 py-2 border border-indigo-100">
                    Calls will start as soon as you confirm.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-indigo-700 block mb-1">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        min={getMinDate()}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-indigo-700 block mb-1">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        min={scheduleDate ? getMinTime(scheduleDate) : undefined}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('config')} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                  Back
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!sendNow && (!scheduleDate || !scheduleTime)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                >
                  Review
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Confirm ── */}
          {step === 'confirm' && (
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Confirm Broadcast</p>
                    <p className="text-xs text-amber-600 mt-1">
                      {sendNow
                        ? `This will immediately start ${selectedLeadIds.size} AI calls in ${langLabel}.`
                        : `This will schedule ${selectedLeadIds.size} AI calls in ${langLabel} for ${scheduleDate} at ${scheduleTime}.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Leads</p>
                  <p className="text-lg font-bold text-gray-800">{selectedLeadIds.size}</p>
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

              {!sendNow && scheduleDate && scheduleTime && (
                <div className="rounded-xl bg-indigo-50 p-3 border border-indigo-100 flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-indigo-600">Scheduled for</p>
                    <p className="text-sm font-bold text-indigo-800">
                      {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep('schedule')} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: sendNow ? 'linear-gradient(135deg, #10B981, #34D399)' : 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : sendNow ? <Phone className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                  {submitting ? 'Processing...' : sendNow ? 'Start Now' : 'Schedule Broadcast'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Result ── */}
          {step === 'result' && (
            <div className="px-5 py-6 space-y-4">
              {error ? (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-sm font-semibold text-red-700">Failed</p>
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              ) : result ? (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm font-semibold text-green-700">
                    {result.scheduled ? 'Broadcast Scheduled!' : 'Broadcast Started!'}
                  </p>
                  <p className="text-xs text-gray-500">{result.message}</p>

                  <div className="grid grid-cols-2 gap-2">
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
    </div>
  );
}
