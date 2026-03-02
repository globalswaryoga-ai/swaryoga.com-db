'use client';

import React, { useEffect, useState } from 'react';
import { X, Phone, PhoneCall, PlayCircle, Clock, Globe, Mic, Loader2, CheckCircle, XCircle, AlertCircle, Monitor, Bot, Copy, ExternalLink, ChevronDown } from 'lucide-react';

const PERSONAL_NUMBER = '919779006820';
const PERSONAL_NUMBER_DISPLAY = '+91 97790 06820';

type CallMode = 'ai' | 'pc';

// Supported languages for AI calls
const CALL_LANGUAGES = [
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'mr', label: 'Marathi', flag: '🇮🇳' },
  { code: 'zh', label: 'Mandarin', flag: '🇨🇳' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', label: 'Swedish', flag: '🇸🇪' },
  { code: 'th', label: 'Thai', flag: '🇹🇭' },
  { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
  { code: 'multi', label: 'Multi', flag: '🌐' },
];

interface RetellAgentOption {
  agent_id: string;
  agent_name: string;
  language?: string;
  voice_id?: string;
}

interface CallLog {
  _id: string;
  purpose: string;
  status: string;
  language: string;
  duration: number;
  summary: string;
  sentiment: string;
  callEndedReason: string;
  collectedData: Record<string, any>;
  crmUpdates: Array<{ field: string; oldValue: any; newValue: any }>;
  createdAt: string;
}

interface AICallModalProps {
  leadId: string;
  leadName: string;
  leadPhone: string;
  token: string;
  onClose: () => void;
  onCallMade?: () => void;
}

const DEFAULT_PURPOSE_OPTIONS = [
  { value: 'welcome', label: '🙏 Welcome', desc: 'First call — introduce Swar Yoga' },
  { value: 'follow_up', label: '📞 Follow-up', desc: 'Check in, collect questions' },
  { value: 'answer_questions', label: '💬 Answer Back', desc: 'Call back with answers from Mohan Sir' },
  { value: 'workshop_reminder', label: '📅 Workshop', desc: 'Remind about workshop enrollment' },
  { value: 'collect_info', label: '📋 Collect Info', desc: 'Gather email, country, preferences' },
  { value: 'payment_reminder', label: '💳 Payment', desc: 'Gentle payment follow-up' },
  { value: 'custom', label: '✏️ Custom', desc: 'Write your own call instructions' },
];

interface SavedTemplate {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  language: string;
  promptText: string;
  voiceRecordingUrl: string;
  approvalStatus: string;
  isActive: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  queued: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="h-3 w-3" /> },
  ringing: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Phone className="h-3 w-3 animate-pulse" /> },
  in_progress: { bg: 'bg-green-100', text: 'text-green-700', icon: <Mic className="h-3 w-3 animate-pulse" /> },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { bg: 'bg-red-100', text: 'text-red-600', icon: <XCircle className="h-3 w-3" /> },
  no_answer: { bg: 'bg-orange-100', text: 'text-orange-600', icon: <AlertCircle className="h-3 w-3" /> },
  busy: { bg: 'bg-orange-100', text: 'text-orange-600', icon: <AlertCircle className="h-3 w-3" /> },
  canceled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <XCircle className="h-3 w-3" /> },
};

export default function AICallModal({ leadId, leadName, leadPhone, token, onClose, onCallMade }: AICallModalProps) {
  const [mode, setMode] = useState<CallMode>('pc');
  const [purpose, setPurpose] = useState('follow_up');
  const [language, setLanguage] = useState('hi');
  const [customPrompt, setCustomPrompt] = useState('');
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState('');
  const [callResult, setCallResult] = useState<{ callId: string; status: string; message: string } | null>(null);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Agent mapping state
  const [resolvedAgent, setResolvedAgent] = useState<{ agentId: string; agentName: string } | null>(null);
  const [agentResolving, setAgentResolving] = useState(false);
  const [manualAgentMode, setManualAgentMode] = useState(false);
  const [manualAgentId, setManualAgentId] = useState('');
  const [availableAgents, setAvailableAgents] = useState<RetellAgentOption[]>([]);

  // Fetch call history
  useEffect(() => {
    (async () => {
      try {
        setHistoryLoading(true);
        const res = await fetch(`/api/admin/crm/calls?leadId=${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.data) {
          setCallHistory(json.data.calls || []);
          setConfigured(json.data.configured ?? true);
          setMissingKeys(json.data.missing || []);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [leadId, token]);

  // Fetch saved templates from DB
  useEffect(() => {
    (async () => {
      try {
        setTemplatesLoading(true);
        const res = await fetch(`/api/admin/crm/calls/templates?language=${language}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.data?.templates) {
          setSavedTemplates(json.data.templates.filter((t: SavedTemplate) => t.promptText));
        }
      } catch (e: any) {
        console.error('Failed to fetch templates:', e);
      } finally {
        setTemplatesLoading(false);
      }
    })();
  }, [token, language]);

  // Resolve agent for selected language (auto-mapping)
  useEffect(() => {
    if (manualAgentMode) return;
    (async () => {
      try {
        setAgentResolving(true);
        const res = await fetch(`/api/admin/crm/calls/agent-mapping?resolve=${language}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.data?.resolved) {
          setResolvedAgent(json.data.resolved);
        } else {
          setResolvedAgent(null);
        }
      } catch {
        setResolvedAgent(null);
      } finally {
        setAgentResolving(false);
      }
    })();
  }, [language, token, manualAgentMode]);

  // Fetch available agents for manual override dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/crm/calls?action=list_agents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.data?.agents) {
          setAvailableAgents(json.data.agents.map((a: any) => ({
            agent_id: a.agent_id,
            agent_name: a.agent_name || a.agent_id,
            language: a.language,
            voice_id: a.voice_id,
          })));
        }
      } catch { /* ignore */ }
    })();
  }, [token]);

  // Merge saved templates with default purposes
  const purposeOptions = (() => {
    // Start with templates from DB that have content
    const fromDB = savedTemplates.map(t => ({
      value: `tmpl_${t._id}`,
      label: `📋 ${t.name}`,
      desc: t.description?.slice(0, 50) || t.promptText?.slice(0, 50) || t.category,
      promptText: t.promptText,
    }));
    // Add custom option at the end
    const custom = { value: 'custom', label: '✏️ Custom', desc: 'Write your own call instructions', promptText: '' };
    return fromDB.length > 0 ? [...fromDB, custom] : [...DEFAULT_PURPOSE_OPTIONS];
  })();

  const handleCall = async () => {
    try {
      setCalling(true);
      setError('');
      setCallResult(null);

      const res = await fetch('/api/admin/crm/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          purpose,
          language,
          customPrompt: (purpose === 'custom' || purpose === 'answer_questions' || purpose.startsWith('tmpl_')) ? customPrompt : undefined,
          overrideAgentId: manualAgentMode && manualAgentId ? manualAgentId : undefined,
          overrideVoiceId: manualAgentMode && manualAgentId
            ? availableAgents.find(a => a.agent_id === manualAgentId)?.voice_id || undefined
            : undefined,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setCallResult(json.data);
        onCallMade?.();
        // Add to history
        setCallHistory(prev => [{
          _id: json.data.callId,
          purpose,
          status: json.data.status || 'ringing',
          language: language === 'hi' ? 'hi-IN' : 'en-IN',
          duration: 0,
          summary: '',
          sentiment: '',
          callEndedReason: '',
          collectedData: {},
          crmUpdates: [],
          createdAt: new Date().toISOString(),
        }, ...prev]);
      } else {
        setError(json.error || 'Failed to start call');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setCalling(false);
    }
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const handleCopyNumber = async () => {
    const num = leadPhone || '';
    if (!num) return;
    try {
      await navigator.clipboard.writeText(num.startsWith('+') ? num : `+${num}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const rawPhone = (leadPhone || '').replace(/\D/g, '');
  const isIndian = rawPhone.startsWith('91') && rawPhone.length === 12;

  const formattedLeadPhone = (() => {
    if (isIndian) {
      return `+${rawPhone.slice(0, 2)} ${rawPhone.slice(2, 7)} ${rawPhone.slice(7)}`;
    }
    return rawPhone ? `+${rawPhone}` : 'No phone';
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-gray-100">
          <div>
            <p className="text-xs font-bold tracking-widest text-orange-600 uppercase flex items-center gap-1">
              <PhoneCall className="h-3.5 w-3.5" /> Call Center
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">{leadName || 'Lead'}</h2>
            <p className="text-xs text-gray-400">{formattedLeadPhone}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-3 pb-1 flex gap-2">
          <button
            onClick={() => { setMode('pc'); setError(''); setCallResult(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              mode === 'pc'
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            PC Call
          </button>
          <button
            onClick={() => { setMode('ai'); setError(''); setCallResult(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              mode === 'ai'
                ? 'border-orange-400 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            AI Call
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ═══════════ PC CALL MODE ═══════════ */}
          {mode === 'pc' && (
            <div className="px-6 pt-4 pb-4">
              {/* International badge */}
              {!isIndian && rawPhone && (
                <div className="mb-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
                  <p className="font-semibold flex items-center gap-1">🌍 International Number — Use WhatsApp Call (Free)</p>
                  <p className="text-[10px] text-green-500 mt-0.5">Regular calls will incur international charges. WhatsApp call is free over internet.</p>
                </div>
              )}

              {/* From number */}
              <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mb-1">Calling from</p>
                <p className="text-sm font-bold text-blue-700">{PERSONAL_NUMBER_DISPLAY}</p>
                <p className="text-[10px] text-blue-400 mt-0.5">Personal Number</p>
              </div>

              {/* Lead number display */}
              <div className="mb-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Calling to</p>
                  <p className="text-sm font-bold text-gray-800">{formattedLeadPhone}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{leadName} {!isIndian && rawPhone ? '(International)' : ''}</p>
                </div>
                <button
                  onClick={handleCopyNumber}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    copied ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Call buttons — different layout for Indian vs International */}
              <div className="space-y-2">
                {isIndian ? (
                  <>
                    {/* Indian: Phone call is primary */}
                    <a
                      href={`tel:+${rawPhone}`}
                      onClick={() => onCallMade?.()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
                    >
                      <Phone className="h-4 w-4" />
                      Call from This Device
                    </a>
                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${rawPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition"
                      >
                        <ExternalLink className="h-3 w-3" />
                        WhatsApp Call
                      </a>
                      <a
                        href={`facetime:+${rawPhone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition"
                      >
                        <Phone className="h-3 w-3" />
                        FaceTime
                      </a>
                      <a
                        href={`skype:+${rawPhone}?call`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 transition"
                      >
                        <Phone className="h-3 w-3" />
                        Skype
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    {/* International: WhatsApp call is primary (free) */}
                    <a
                      href={`https://wa.me/${rawPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onCallMade?.()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition"
                      style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}
                    >
                      <Phone className="h-4 w-4" />
                      WhatsApp Call (Free)
                    </a>
                    <div className="flex gap-2">
                      <a
                        href={`tel:+${rawPhone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition"
                      >
                        <Phone className="h-3 w-3" />
                        Phone (Charges)
                      </a>
                      <a
                        href={`facetime:+${rawPhone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition"
                      >
                        <Phone className="h-3 w-3" />
                        FaceTime
                      </a>
                      <a
                        href={`skype:+${rawPhone}?call`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 transition"
                      >
                        <Phone className="h-3 w-3" />
                        Skype
                      </a>
                    </div>
                  </>
                )}
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-3">
                {isIndian
                  ? 'Call will be made using your device\u0027s phone or calling app'
                  : 'WhatsApp call recommended for international — no charges over internet'}
              </p>
            </div>
          )}

          {/* ═══════════ AI CALL MODE ═══════════ */}
          {mode === 'ai' && (
            <>
          {/* Not configured warning */}
          {!configured && (
            <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <p className="font-semibold mb-1">⚠️ Retell AI Not Configured</p>
              <p>Missing environment variables: <span className="font-mono">{missingKeys.join(', ')}</span></p>
              <p className="mt-1 text-amber-600">Add these to <span className="font-mono">.env.local</span> to enable AI calling.</p>
            </div>
          )}

          {/* Purpose selection */}
          <div className="px-6 pt-4 pb-2">
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Call Purpose {templatesLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</label>
            <div className="grid grid-cols-2 gap-2">
              {purposeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPurpose(opt.value);
                    // If it's a saved template, pre-fill the custom prompt with its script
                    if (opt.value.startsWith('tmpl_') && 'promptText' in opt) {
                      setCustomPrompt((opt as any).promptText || '');
                    }
                  }}
                  className={`text-left px-3 py-2 rounded-xl text-xs border transition ${
                    purpose === opt.value
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-semibold block">{opt.label}</span>
                  <span className="text-[10px] text-gray-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt / Answer questions / Template script textarea */}
          {(purpose === 'custom' || purpose === 'answer_questions' || purpose.startsWith('tmpl_')) && (
            <div className="px-6 pb-2">
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder={purpose === 'answer_questions'
                  ? "Paste answers from Mohan Sir for their questions...\ne.g., Q: Workshop timing? A: Every Saturday 7-8 AM IST\nQ: Fee? A: ₹500 per month"
                  : "Write instructions for the AI agent... e.g., 'Ask about their interest in morning yoga sessions and if weekdays or weekends work better.'"}
                rows={4}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none"
              />
            </div>
          )}

          {/* Language selection — expanded */}
          <div className="px-6 pb-2">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-2">
              <Globe className="h-3.5 w-3.5" /> Language
            </label>
            <div className="flex flex-wrap gap-1">
              {CALL_LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setManualAgentMode(false); setManualAgentId(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    language === l.code ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agent info — auto-resolved + manual override */}
          <div className="px-6 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Bot className="h-3.5 w-3.5" /> AI Agent
              </label>
              <button
                onClick={() => { setManualAgentMode(!manualAgentMode); setManualAgentId(''); }}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition ${
                  manualAgentMode
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {manualAgentMode ? '← Auto' : 'Manual Override'}
              </button>
            </div>

            {manualAgentMode ? (
              <div className="relative">
                <select
                  value={manualAgentId}
                  onChange={e => setManualAgentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none appearance-none pr-8"
                >
                  <option value="">Select agent manually...</option>
                  {availableAgents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.agent_name} {a.language ? `(${a.language})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-amber-400 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                {agentResolving ? (
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                ) : (
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                )}
                <span className="text-xs text-emerald-700 font-medium">
                  {agentResolving
                    ? 'Resolving...'
                    : resolvedAgent
                      ? `Auto: ${resolvedAgent.agentName}`
                      : 'Default agent (no mapping configured)'}
                </span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-3 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Call result */}
          {callResult && (
            <div className="mx-6 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
              <span className="font-semibold">✅ {callResult.message}</span>
            </div>
          )}

          {/* Start call button */}
          <div className="px-6 pb-4">
            <button
              onClick={handleCall}
              disabled={calling || !configured || ((purpose === 'custom' || purpose === 'answer_questions' || purpose.startsWith('tmpl_')) && !customPrompt.trim())}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)' }}
            >
              {calling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting AI Call...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Start AI Call
                </>
              )}
            </button>
          </div>
            </>
          )}

          {/* Call History (both modes) */}
          <div className="px-6 pb-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {mode === 'ai' ? 'AI Call History' : 'Call History'}
            </h3>

            {historyLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : callHistory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No AI calls yet for this lead.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {callHistory.map(call => {
                  const st = STATUS_COLORS[call.status] || STATUS_COLORS.queued;
                  const purposeLabel = purposeOptions.find(p => p.value === call.purpose)?.label || DEFAULT_PURPOSE_OPTIONS.find(p => p.value === call.purpose)?.label || call.purpose;
                  return (
                    <div key={call._id} className="border border-gray-100 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">{purposeLabel}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.text}`}>
                          {st.icon} {call.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        <span>{new Date(call.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{formatDuration(call.duration)}</span>
                        {call.sentiment && (
                          <span className={call.sentiment === 'positive' ? 'text-green-500' : call.sentiment === 'negative' ? 'text-red-500' : 'text-gray-400'}>
                            {call.sentiment === 'positive' ? '😊' : call.sentiment === 'negative' ? '😔' : '😐'} {call.sentiment}
                          </span>
                        )}
                      </div>
                      {call.summary && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{call.summary}</p>
                      )}
                      {call.callEndedReason && call.status !== 'completed' && (
                        <p className="text-[10px] text-red-400 mt-0.5">{call.callEndedReason}</p>
                      )}
                      {call.crmUpdates?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {call.crmUpdates.map((u, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-medium">
                              Updated: {u.field}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {mode === 'ai' ? 'AI Call — Powered by Retell.ai' : `PC Call — From ${PERSONAL_NUMBER_DISPLAY}`}
          </span>
          <button onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
