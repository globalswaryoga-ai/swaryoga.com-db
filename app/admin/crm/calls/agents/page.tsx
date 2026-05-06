'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft, Home, Bot, Plus, RefreshCw, Trash2, Edit3, Save,
  X, Globe, Volume2, Zap, Shield, Clock, Mic, Check, AlertCircle,
  Copy, ExternalLink, Languages, Star, ChevronDown, ChevronRight,
  Settings, Loader2, Phone,
} from 'lucide-react';

/* ── Colors ── */
const COLORS = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  red:     { main: '#EF4444', light: '#F87171', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
};

/* ── Retell supported languages ── */
const RETELL_LANGUAGES: Record<string, string> = {
  'en-US': 'English (US)', 'en-GB': 'English (UK)', 'en-AU': 'English (AU)', 'en-IN': 'English (India)',
  'hi-IN': 'Hindi', 'mr-IN': 'Marathi',
  'es-ES': 'Spanish', 'fr-FR': 'French', 'de-DE': 'German', 'pt-BR': 'Portuguese',
  'zh-CN': 'Mandarin', 'ja-JP': 'Japanese', 'ko-KR': 'Korean', 'ru-RU': 'Russian',
  'it-IT': 'Italian', 'tr-TR': 'Turkish', 'nl-NL': 'Dutch', 'ar-SA': 'Arabic',
  'multi': 'Multilingual',
};

/* ── CRM language codes ── */
const CRM_LANGUAGES: Record<string, string> = {
  hi: 'Hindi', en: 'English', mr: 'Marathi', multi: 'Multilingual',
  zh: 'Mandarin', es: 'Spanish', fr: 'French', ar: 'Arabic',
  de: 'German', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean',
  ru: 'Russian', it: 'Italian', tr: 'Turkish', nl: 'Dutch',
  sv: 'Swedish', th: 'Thai', id: 'Indonesian',
};

interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  language: string;
  is_published: boolean;
  webhook_url?: string;
  response_engine?: { type: string; llm_id?: string; version?: number };
  last_modification_timestamp?: number;
  post_call_analysis_data?: any[];
  max_call_duration_ms?: number;
  interruption_sensitivity?: number;
  crm_mappings: { _id: string; language: string; isDefault: boolean; isActive: boolean; voiceId: string }[];
  crm_languages: string[];
  crm_is_default: boolean;
}

interface Voice {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender?: string;
  accent?: string;
  preview_audio_url?: string;
}

export default function AgentsPage() {
  const token = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<RetellAgent[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [llms, setLlms] = useState<any[]>([]);
  const [crmLanguages, setCrmLanguages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editAgent, setEditAgent] = useState<RetellAgent | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formVoice, setFormVoice] = useState('');
  const [formLanguage, setFormLanguage] = useState('hi-IN');
  const [formLlmId, setFormLlmId] = useState('');
  const [formWebhook, setFormWebhook] = useState('');
  const [formMaxDuration, setFormMaxDuration] = useState(3600000);
  const [formInterruption, setFormInterruption] = useState(0.9);
  const [formCrmLanguages, setFormCrmLanguages] = useState<string[]>([]);
  const [formCrmDefault, setFormCrmDefault] = useState(false);
  const [formPrompt, setFormPrompt] = useState('');

  // Delete confirmation
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const headers = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  /* ── Fetch agents ── */
  const fetchAgents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/calls/agents?voices=true&llms=true', { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents || []);
        setVoices(data.voices || []);
        setLlms(data.llms || []);
        if (data.languages) setCrmLanguages(data.languages);
      }
    } catch (err) {
      showToast('error', 'Failed to load agents');
    }
    setLoading(false);
  }, [token, headers]);

  useEffect(() => { fetchAgents(); }, [token]);

  /* ── Open create modal ── */
  const openCreateModal = () => {
    setEditAgent(null);
    setFormName('');
    setFormVoice('11labs-Hailey');
    setFormLanguage('hi-IN');
    setFormLlmId(llms.length > 0 ? llms[0].llm_id : '');
    setFormWebhook('https://app.swaryoga.com/api/admin/crm/calls/webhook');
    setFormMaxDuration(3600000);
    setFormInterruption(0.9);
    setFormCrmLanguages([]);
    setFormCrmDefault(false);
    setFormPrompt('');
    setShowModal(true);
  };

  /* ── Open edit modal ── */
  const openEditModal = (agent: RetellAgent) => {
    setEditAgent(agent);
    setFormName(agent.agent_name);
    setFormVoice(agent.voice_id);
    setFormLanguage(agent.language);
    setFormLlmId(agent.response_engine?.llm_id || '');
    setFormWebhook(agent.webhook_url || '');
    setFormMaxDuration(agent.max_call_duration_ms || 3600000);
    setFormInterruption(agent.interruption_sensitivity ?? 0.9);
    setFormCrmLanguages(agent.crm_languages || []);
    setFormCrmDefault(agent.crm_is_default || false);
    setFormPrompt('');
    setShowModal(true);
  };

  /* ── Save (create/update) ── */
  const handleSave = async () => {
    if (!formName.trim()) { showToast('error', 'Agent name is required'); return; }
    if (!formVoice.trim()) { showToast('error', 'Voice is required'); return; }

    setSaving(true);
    try {
      const isEdit = !!editAgent;
      const body: any = {
        agent_name: formName.trim(),
        voice_id: formVoice.trim(),
        language: formLanguage,
        webhook_url: formWebhook,
        max_call_duration_ms: formMaxDuration,
        interruption_sensitivity: formInterruption,
        crm_languages: formCrmLanguages,
        crm_is_default: formCrmDefault,
      };

      if (isEdit) {
        body.agent_id = editAgent!.agent_id;
        if (formPrompt.trim()) body.general_prompt = formPrompt.trim();
      } else {
        if (formLlmId) body.llm_id = formLlmId;
        if (formPrompt.trim()) body.general_prompt = formPrompt.trim();
      }

      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch('/api/admin/crm/calls/agents', {
        method,
        headers: headers(),
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        showToast('success', data.message || (isEdit ? 'Agent updated' : 'Agent created'));
        setShowModal(false);
        fetchAgents();
      } else {
        showToast('error', data.error || 'Failed to save agent');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save');
    }
    setSaving(false);
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteAgentId) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/crm/calls/agents', {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({ agent_id: deleteAgentId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Agent deleted');
        setDeleteAgentId(null);
        fetchAgents();
      } else {
        showToast('error', data.error || 'Failed to delete');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
    setDeleting(false);
  };

  /* ── Sync all agents from Retell → CRM ── */
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // For each agent without CRM mapping, create mapping based on its Retell language
      let synced = 0;
      for (const agent of agents) {
        if (agent.crm_languages.length === 0) {
          // Derive CRM language from Retell language code
          const crmLang = agent.language?.split('-')[0]?.toLowerCase() || 'multi';
          const res = await fetch('/api/admin/crm/calls/agent-mapping', {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({
              language: crmLang,
              agentId: agent.agent_id,
              agentName: agent.agent_name,
              voiceId: agent.voice_id,
              isActive: true,
            }),
          });
          if ((await res.json()).success) synced++;
        }
      }
      showToast('success', synced > 0 ? `Synced ${synced} agent(s) to CRM` : 'All agents already synced');
      fetchAgents();
    } catch (err: any) {
      showToast('error', err.message);
    }
    setSyncing(false);
  };

  /* ── Toggle CRM language in form ── */
  const toggleCrmLang = (lang: string) => {
    setFormCrmLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  /* ── Copy to clipboard ── */
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'Copied!');
  };

  /* ── Voice display name ── */
  const voiceLabel = (vid: string) => {
    const v = voices.find(v => v.voice_id === vid);
    return v ? `${v.voice_name} (${v.provider})` : vid;
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white animate-in fade-in slide-in-from-right-5 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition text-gray-500">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Link href="/admin/crm" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition text-gray-500">
              <Home className="h-4.5 w-4.5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" /> AI Agents
              </h1>
              <p className="text-xs text-gray-400">{agents.length} agents • Manage Retell AI agents & CRM mappings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/crm/calls" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}>
              <Phone className="h-4 w-4" /> Calls
            </Link>
            <button onClick={handleSyncAll} disabled={syncing || loading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Sync All'}
            </button>
            <button onClick={fetchAgents} disabled={loading} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition text-gray-500 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openCreateModal} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
              <Plus className="h-4 w-4" /> New Agent
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-600 mb-2">No Agents Found</h2>
            <p className="text-gray-400 mb-6">Create your first AI agent or check your Retell API key</p>
            <button onClick={openCreateModal} className="px-4 py-2 rounded-xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
              <Plus className="h-4 w-4 inline mr-1" /> Create Agent
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {agents.map((agent) => {
              const isExpanded = expandedId === agent.agent_id;
              const isDefault = agent.crm_is_default;
              const hasMappings = agent.crm_languages.length > 0;

              return (
                <div key={agent.agent_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : agent.agent_id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDefault ? 'linear-gradient(135deg, #6366F1, #EC4899)' : 'linear-gradient(135deg, #E0E7FF, #C7D2FE)' }}>
                        <Bot className={`h-5 w-5 ${isDefault ? 'text-white' : 'text-indigo-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 truncate">{agent.agent_name}</h3>
                          {isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}>
                              <Star className="h-2.5 w-2.5 inline mr-0.5" />DEFAULT
                            </span>
                          )}
                          {agent.is_published && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Published</span>
                          )}
                          {!agent.is_published && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">Draft</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1"><Volume2 className="h-3 w-3" />{voiceLabel(agent.voice_id)}</span>
                          <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{RETELL_LANGUAGES[agent.language] || agent.language}</span>
                          {hasMappings && (
                            <span className="flex items-center gap-1"><Languages className="h-3 w-3 text-indigo-400" />{agent.crm_languages.map(l => CRM_LANGUAGES[l] || l).join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEditModal(agent); }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition" title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteAgentId(agent.agent_id); }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Agent ID */}
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
                          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Agent ID</div>
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono text-gray-700 truncate">{agent.agent_id}</code>
                            <button onClick={() => copyText(agent.agent_id)} className="text-gray-400 hover:text-indigo-500 transition"><Copy className="h-3 w-3" /></button>
                          </div>
                        </div>

                        {/* Voice */}
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
                          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Voice</div>
                          <div className="text-xs font-medium text-gray-700">{voiceLabel(agent.voice_id)}</div>
                        </div>

                        {/* Language */}
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
                          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Retell Language</div>
                          <div className="text-xs font-medium text-gray-700">{RETELL_LANGUAGES[agent.language] || agent.language}</div>
                        </div>

                        {/* LLM */}
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
                          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Response Engine</div>
                          <div className="text-xs font-medium text-gray-700">
                            {agent.response_engine?.type || 'N/A'}
                            {agent.response_engine?.llm_id && (
                              <span className="text-gray-400 ml-1">(v{agent.response_engine.version})</span>
                            )}
                          </div>
                        </div>

                        {/* Webhook */}
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
                          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Webhook URL</div>
                          <div className="text-xs font-mono text-gray-700 truncate">{agent.webhook_url || 'Not set'}</div>
                        </div>

                        {/* Max Duration */}
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
                          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Max Duration</div>
                          <div className="text-xs font-medium text-gray-700">{agent.max_call_duration_ms ? `${Math.round(agent.max_call_duration_ms / 60000)} min` : '60 min'}</div>
                        </div>
                      </div>

                      {/* CRM Language Mappings */}
                      <div className="px-3 py-3 rounded-xl bg-white border border-gray-100">
                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">CRM Language Mappings</div>
                        {agent.crm_mappings.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {agent.crm_mappings.map((m) => (
                              <span key={m._id} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${m.isDefault ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                {CRM_LANGUAGES[m.language] || m.language}
                                {m.isDefault && <Star className="h-2.5 w-2.5 inline ml-1" />}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No CRM mappings — this agent won&apos;t be auto-selected for any language</p>
                        )}
                      </div>

                      {/* Post-call analysis */}
                      {agent.post_call_analysis_data && agent.post_call_analysis_data.length > 0 && (
                        <div className="px-3 py-3 rounded-xl bg-white border border-gray-100">
                          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Post-Call Analysis Fields</div>
                          <div className="flex flex-wrap gap-2">
                            {agent.post_call_analysis_data.map((f: any, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                                {f.name} ({f.type})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`https://www.retellai.com/dashboard`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                        >
                          <ExternalLink className="h-3 w-3" /> Open in Retell Dashboard
                        </a>
                        <button onClick={() => openEditModal(agent)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                          <Settings className="h-3 w-3" /> Edit Settings
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" />
                {editAgent ? 'Edit Agent' : 'Create New Agent'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Basic Info</h3>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Agent Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Sakshi Hindi Agent"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Voice *</label>
                    <select
                      value={formVoice}
                      onChange={e => setFormVoice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                    >
                      <option value="">Select a voice...</option>
                      {voices.map(v => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.voice_name} ({v.provider}{v.gender ? ` · ${v.gender}` : ''}{v.accent ? ` · ${v.accent}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Language</label>
                    <select
                      value={formLanguage}
                      onChange={e => setFormLanguage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                    >
                      {Object.entries(RETELL_LANGUAGES).map(([code, name]) => (
                        <option key={code} value={code}>{name} ({code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* LLM & Webhook */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Settings className="h-3.5 w-3.5 text-violet-500" /> Configuration</h3>

                {!editAgent && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">LLM (Response Engine)</label>
                    <select
                      value={formLlmId}
                      onChange={e => setFormLlmId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                    >
                      <option value="">Use default LLM</option>
                      {llms.map(l => (
                        <option key={l.llm_id} value={l.llm_id}>
                          {l.llm_id} ({l.model || 'unknown model'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Webhook URL</label>
                  <input
                    type="url"
                    value={formWebhook}
                    onChange={e => setFormWebhook(e.target.value)}
                    placeholder="https://app.swaryoga.com/api/admin/crm/calls/webhook"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Max Call Duration (min)</label>
                    <input
                      type="number"
                      value={Math.round(formMaxDuration / 60000)}
                      onChange={e => setFormMaxDuration(Number(e.target.value) * 60000)}
                      min={1}
                      max={120}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Interruption Sensitivity</label>
                    <input
                      type="range"
                      value={formInterruption}
                      onChange={e => setFormInterruption(Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full mt-1"
                    />
                    <span className="text-[10px] text-gray-400">{formInterruption}</span>
                  </div>
                </div>
              </div>

              {/* Agent Prompt */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Mic className="h-3.5 w-3.5 text-pink-500" /> Agent Prompt {editAgent && <span className="text-xs font-normal text-gray-400">(leave blank to keep current)</span>}</h3>
                <textarea
                  value={formPrompt}
                  onChange={e => setFormPrompt(e.target.value)}
                  placeholder="You are Sakshi, the official AI assistant of Swar Yoga..."
                  rows={6}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition resize-y"
                />
              </div>

              {/* CRM Language Mapping */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 text-indigo-500" /> CRM Language Mappings</h3>
                <p className="text-xs text-gray-400">Select which languages this agent should handle in the CRM. When a call is made in one of these languages, this agent will be automatically selected.</p>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(CRM_LANGUAGES).map(([code, name]) => {
                    const selected = formCrmLanguages.includes(code);
                    return (
                      <button
                        key={code}
                        onClick={() => toggleCrmLang(code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${selected ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {selected && <Check className="h-3 w-3 inline mr-1" />}
                        {name}
                      </button>
                    );
                  })}
                </div>

                {formCrmLanguages.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={formCrmDefault}
                      onChange={e => setFormCrmDefault(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-200"
                    />
                    Set as <strong>default</strong> agent (fallback for unmapped languages)
                  </label>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : editAgent ? 'Update Agent' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteAgentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteAgentId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Agent?</h3>
                <p className="text-xs text-gray-400">This will permanently delete the agent from Retell and remove all CRM mappings</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Agent: <strong>{agents.find(a => a.agent_id === deleteAgentId)?.agent_name}</strong></p>
            <p className="text-xs text-gray-400 font-mono mb-4">{deleteAgentId}</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteAgentId(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Deleting...' : 'Delete Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
