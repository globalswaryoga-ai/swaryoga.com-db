'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  ArrowLeft, Bot, RefreshCw, Loader2, Search,
  Settings, Volume2, Mic, Globe, Phone,
  CheckCircle, Play, Pause, X, ChevronRight,
  Zap, Activity, Clock, ExternalLink,
} from 'lucide-react';

// ── Colors ──
const C = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)' },
  orange:  { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)' },
  red:     { main: '#EF4444', light: '#F87171', bg: 'rgba(239,68,68,0.08)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)' },
  gray:    { main: '#6B7280', light: '#9CA3AF', bg: 'rgba(107,114,128,0.08)' },
};

// Voice provider avatar colors based on voice ID prefix
function getVoiceColor(voiceId: string): string {
  if (voiceId?.includes('11labs')) return C.violet.main;
  if (voiceId?.includes('openai')) return C.emerald.main;
  if (voiceId?.includes('deepgram')) return C.blue.main;
  return C.indigo.main;
}

function getVoiceProvider(voiceId: string): string {
  if (voiceId?.includes('11labs')) return 'ElevenLabs';
  if (voiceId?.includes('openai')) return 'OpenAI';
  if (voiceId?.includes('deepgram')) return 'Deepgram';
  if (voiceId?.includes('cartesia')) return 'Cartesia';
  if (voiceId?.includes('minimax')) return 'MiniMax';
  return 'Retell';
}

function getVoiceName(voiceId: string): string {
  if (!voiceId) return 'Unknown';
  // Extract name from voice_id like "11labs-Hailey" → "Hailey"
  const parts = voiceId.split('-');
  return parts.length > 1 ? parts.slice(1).join('-') : voiceId;
}

function getLanguageLabel(lang: string): { label: string; flag: string } {
  const map: Record<string, { label: string; flag: string }> = {
    'en': { label: 'English', flag: '🇬🇧' },
    'en-US': { label: 'English (US)', flag: '🇺🇸' },
    'en-IN': { label: 'English (India)', flag: '🇮🇳' },
    'hi': { label: 'Hindi', flag: '🇮🇳' },
    'hi-IN': { label: 'Hindi', flag: '🇮🇳' },
    'mr': { label: 'Marathi', flag: '🇮🇳' },
    'ne': { label: 'Nepali', flag: '🇳🇵' },
    'multi': { label: 'Multilingual', flag: '🌐' },
    'zh': { label: 'Chinese', flag: '🇨🇳' },
    'es': { label: 'Spanish', flag: '🇪🇸' },
    'fr': { label: 'French', flag: '🇫🇷' },
    'de': { label: 'German', flag: '🇩🇪' },
    'ja': { label: 'Japanese', flag: '🇯🇵' },
    'ko': { label: 'Korean', flag: '🇰🇷' },
    'ar': { label: 'Arabic', flag: '🇸🇦' },
    'pt': { label: 'Portuguese', flag: '🇧🇷' },
  };
  return map[lang] || { label: lang || 'Not Set', flag: '🌐' };
}

// ── Agent interface ──
interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  voice_model?: string;
  voice_speed?: number;
  voice_temperature?: number;
  voice_volume?: number;
  volume?: number;
  language?: string;
  response_engine?: any;
  llm_websocket_url?: string;
  last_modification_timestamp?: number;
  webhook_url?: string;
  ambient_sound?: string;
  ambient_sound_volume?: number;
  responsiveness?: number;
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  reminder_trigger_ms?: number;
  reminder_max_count?: number;
  boosted_keywords?: string[];
  opt_out_sensitive_data_storage?: boolean;
  pronunciation_dictionary?: any[];
  end_call_after_silence_ms?: number;
  max_call_duration_ms?: number;
  begin_message?: string;
  general_prompt?: string;
  [key: string]: any;
}

export default function AIAgentsPage() {
  const router = useRouter();
  const token = useAuth();

  const [agents, setAgents] = useState<RetellAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [phoneMap, setPhoneMap] = useState<Record<string, string>>({});

  // Detail panel
  const [selectedAgent, setSelectedAgent] = useState<RetellAgent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Active agent ID (stored in localStorage for CRM use)
  const [activeAgentId, setActiveAgentId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('crm_active_agent_id') || '';
    setActiveAgentId(stored);
  }, []);

  // ── Fetch agents ──
  const fetchAgents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/ai-agents?action=list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data?.agents) {
        setAgents(data.data.agents);
        if (data.data.phoneMap) setPhoneMap(data.data.phoneMap);
      } else {
        setError('No agents returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAgents();
  }, [token, fetchAgents]);

  // ── Fetch agent detail ──
  const fetchAgentDetail = useCallback(async (agentId: string) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/ai-agents?action=detail&id=${agentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data?.agent) {
        setSelectedAgent(data.data.agent);
      }
    } catch (err: any) {
      console.error('Failed to fetch agent detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  // ── Set active agent ──
  const handleSetActive = useCallback(async (agentId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/ai-agents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', agentId }),
      });
      const data = await res.json();
      if (data.data) {
        setActiveAgentId(agentId);
        localStorage.setItem('crm_active_agent_id', agentId);
      }
    } catch (err) {
      console.error('Failed to set active agent:', err);
    }
  }, [token]);

  // ── Filter agents ──
  const filteredAgents = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.agent_name?.toLowerCase().includes(q) ||
      a.voice_id?.toLowerCase().includes(q) ||
      a.agent_id?.toLowerCase().includes(q) ||
      a.language?.toLowerCase().includes(q)
    );
  });

  // ── Settings Panel Value Display ──
  const SettingsSlider = ({ label, value, min, max, step, unit, icon: Icon }: {
    label: string; value: number | undefined; min: number; max: number; step: number; unit?: string; icon?: any
  }) => {
    const val = value ?? ((min + max) / 2);
    const pct = ((val - min) / (max - min)) * 100;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
            {label}
          </span>
          <span className="text-xs font-bold text-gray-800">{val.toFixed(step < 1 ? 1 : 0)}{unit || ''}</span>
        </div>
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.violet.main}, ${C.indigo.main})` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-gray-400">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/30">
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/crm')} className="p-2 hover:bg-gray-100 rounded-xl transition">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${C.violet.main}, ${C.indigo.main})` }}>
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                AI Voice Agents
                <span className="text-[10px] font-medium text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">Retell AI</span>
              </h1>
              <p className="text-xs text-gray-500">Manage your AI voice agents • Connected to Retell AI Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://beta.retellai.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Retell Dashboard
            </a>
            <Link
              href="/admin/crm/calls/templates"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-xl transition"
              style={{ background: C.emerald.main }}
            >
              <Phone className="h-3.5 w-3.5" />
              Call Scripts
            </Link>
            <button
              onClick={fetchAgents}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.violet.bg }}>
                <Bot className="h-5 w-5" style={{ color: C.violet.main }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
                <p className="text-xs text-gray-500">Total Agents</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.emerald.bg }}>
                <CheckCircle className="h-5 w-5" style={{ color: C.emerald.main }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeAgentId ? 1 : 0}</p>
                <p className="text-xs text-gray-500">Active in CRM</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.blue.bg }}>
                <Mic className="h-5 w-5" style={{ color: C.blue.main }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(agents.map(a => getVoiceProvider(a.voice_id))).size}
                </p>
                <p className="text-xs text-gray-500">Voice Providers</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.orange.bg }}>
                <Globe className="h-5 w-5" style={{ color: C.orange.main }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(agents.map(a => a.language || 'en').map(l => l.split('-')[0])).size}
                </p>
                <p className="text-xs text-gray-500">Languages</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents by name, voice, language..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none bg-white"
            />
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <X className="h-4 w-4" /> {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading agents from Retell AI...</p>
            </div>
          </div>
        )}

        {/* ── Agent Grid + Detail Panel ── */}
        {!loading && (
          <div className="flex gap-6">
            {/* Agent Cards Grid */}
            <div className={`${selectedAgent ? 'w-[55%]' : 'w-full'} transition-all`}>
              {filteredAgents.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No agents found</p>
                  <p className="text-gray-400 text-xs mt-1">Create agents in the Retell AI Dashboard</p>
                  <a
                    href="https://beta.retellai.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-medium text-white rounded-xl transition"
                    style={{ background: C.violet.main }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open Retell Dashboard
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAgents.map(agent => {
                    const isActive = activeAgentId === agent.agent_id;
                    const isSelected = selectedAgent?.agent_id === agent.agent_id;
                    const voiceName = getVoiceName(agent.voice_id);
                    const provider = getVoiceProvider(agent.voice_id);
                    const langInfo = getLanguageLabel(agent.language || 'en');
                    const color = getVoiceColor(agent.voice_id);
                    const initial = (agent.agent_name || 'A')[0].toUpperCase();
                    const agentType = agent.response_engine?.type === 'conversation-flow' ? 'Conversation Flow' : 'Single Prompt';
                    const agentPhone = phoneMap[agent.agent_id] || null;

                    return (
                      <div
                        key={agent.agent_id}
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowSettings(false);
                          fetchAgentDetail(agent.agent_id);
                        }}
                        className={`relative bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group ${
                          isSelected
                            ? 'border-violet-400 shadow-lg shadow-violet-100'
                            : isActive
                              ? 'border-emerald-300 shadow-md shadow-emerald-50'
                              : 'border-gray-100 hover:border-violet-200'
                        }`}
                      >
                        {/* Active badge */}
                        {isActive && (
                          <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center gap-1 shadow-md">
                            <CheckCircle className="h-2.5 w-2.5" /> ACTIVE
                          </div>
                        )}

                        {/* Agent Header */}
                        <div className="flex items-start gap-3 mb-3">
                          {/* Avatar */}
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                          >
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 truncate">{agent.agent_name || 'Unnamed Agent'}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: `${color}15`, color }}>
                                {provider}
                              </span>
                              <span className="text-[10px] text-gray-400">•</span>
                              <span className="text-[10px] text-gray-500">{voiceName}</span>
                            </div>
                          </div>
                          {/* Settings gear */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAgent(agent);
                              setShowSettings(true);
                              fetchAgentDetail(agent.agent_id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition opacity-0 group-hover:opacity-100"
                          >
                            <Settings className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>

                        {/* Language & Voice Info */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className="text-[10px] font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">{agentType}</span>
                          <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-50 rounded-lg">
                            <span>{langInfo.flag}</span>
                            <span className="font-medium text-gray-600">{langInfo.label}</span>
                          </span>
                          {agentPhone && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-medium">
                              <Phone className="h-2.5 w-2.5" /> {agentPhone}
                            </span>
                          )}
                          {agent.voice_model && (
                            <span className="text-[10px] px-2 py-1 bg-gray-50 rounded-lg text-gray-500">
                              {agent.voice_model}
                            </span>
                          )}
                        </div>

                        {/* Voice Settings Mini */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                            <p className="text-[9px] text-gray-400">Speed</p>
                            <p className="text-xs font-bold text-gray-700">{agent.voice_speed?.toFixed(1) ?? '1.0'}</p>
                          </div>
                          <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                            <p className="text-[9px] text-gray-400">Temp</p>
                            <p className="text-xs font-bold text-gray-700">{agent.voice_temperature?.toFixed(1) ?? '1.0'}</p>
                          </div>
                          <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                            <p className="text-[9px] text-gray-400">Volume</p>
                            <p className="text-xs font-bold text-gray-700">{(agent.volume ?? agent.voice_volume)?.toFixed(1) ?? '1.0'}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetActive(agent.agent_id);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'
                            }`}
                          >
                            {isActive ? (
                              <><CheckCircle className="h-3 w-3" /> Active in CRM</>
                            ) : (
                              <><Zap className="h-3 w-3" /> Use in CRM</>
                            )}
                          </button>
                          <Link
                            href={`/admin/crm/calls/templates?agent=${agent.agent_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition border border-gray-200"
                          >
                            <Phone className="h-3 w-3" />
                            Scripts
                          </Link>
                        </div>

                        {/* Agent ID */}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[9px] text-gray-300 truncate font-mono">{agent.agent_id}</p>
                          {agent.last_modification_timestamp && (
                            <p className="text-[9px] text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(agent.last_modification_timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Detail / Settings Panel ── */}
            {selectedAgent && (
              <div className="w-[45%] sticky top-20 self-start">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                  {/* Panel Header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
                    style={{ background: `linear-gradient(135deg, ${C.violet.bg}, ${C.indigo.bg})` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md"
                        style={{ background: `linear-gradient(135deg, ${getVoiceColor(selectedAgent.voice_id)}, ${getVoiceColor(selectedAgent.voice_id)}dd)` }}
                      >
                        {(selectedAgent.agent_name || 'A')[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{selectedAgent.agent_name || 'Unnamed'}</h3>
                        <p className="text-[10px] text-gray-500">{getVoiceProvider(selectedAgent.voice_id)} • {getVoiceName(selectedAgent.voice_id)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition ${showSettings ? 'bg-violet-100 text-violet-600' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedAgent(null); setShowSettings(false); }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {detailLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                    </div>
                  ) : showSettings ? (
                    /* ── Voice Settings Panel ── */
                    <div className="p-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
                      <div className="flex items-center gap-2 mb-1">
                        <Volume2 className="h-4 w-4 text-violet-500" />
                        <h4 className="text-sm font-bold text-gray-800">Voice Configuration</h4>
                      </div>

                      {/* Voice Info */}
                      <div className="p-3 bg-violet-50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Voice ID</span>
                          <span className="text-xs font-mono font-medium text-violet-700">{selectedAgent.voice_id || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Provider</span>
                          <span className="text-xs font-medium text-violet-700">{getVoiceProvider(selectedAgent.voice_id)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Voice Name</span>
                          <span className="text-xs font-medium text-violet-700">{getVoiceName(selectedAgent.voice_id)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Voice Model</span>
                          <span className="text-xs font-medium text-violet-700">{selectedAgent.voice_model || 'default'}</span>
                        </div>
                      </div>

                      {/* Voice Sliders */}
                      <div className="space-y-4">
                        <SettingsSlider label="Voice Speed" value={selectedAgent.voice_speed} min={0.5} max={2.0} step={0.1} unit="x" icon={Zap} />
                        <SettingsSlider label="Voice Temperature" value={selectedAgent.voice_temperature} min={0} max={2.0} step={0.1} icon={Activity} />
                        <SettingsSlider label="Voice Volume" value={selectedAgent.volume ?? selectedAgent.voice_volume} min={0} max={2.0} step={0.1} icon={Volume2} />
                        {selectedAgent.responsiveness !== undefined && (
                          <SettingsSlider label="Responsiveness" value={selectedAgent.responsiveness} min={0} max={1.0} step={0.1} icon={Zap} />
                        )}
                        {selectedAgent.interruption_sensitivity !== undefined && (
                          <SettingsSlider label="Interruption Sensitivity" value={selectedAgent.interruption_sensitivity} min={0} max={1.0} step={0.1} icon={Mic} />
                        )}
                      </div>

                      {/* Ambient Sound */}
                      {selectedAgent.ambient_sound && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Ambient Sound</span>
                            <span className="text-xs font-medium text-gray-700">{selectedAgent.ambient_sound}</span>
                          </div>
                          {selectedAgent.ambient_sound_volume !== undefined && (
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">Ambient Volume</span>
                              <span className="text-xs font-medium text-gray-700">{selectedAgent.ambient_sound_volume}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Boosted Keywords */}
                      {selectedAgent.boosted_keywords && selectedAgent.boosted_keywords.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Boosted Keywords</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedAgent.boosted_keywords.map((kw, i) => (
                              <span key={i} className="text-[10px] px-2 py-1 bg-violet-50 text-violet-700 rounded-lg font-medium">{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Call Limits */}
                      <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                        <p className="text-xs font-medium text-gray-600">Call Settings</p>
                        {selectedAgent.max_call_duration_ms && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Max Duration</span>
                            <span className="text-xs font-medium text-gray-700">{Math.round(selectedAgent.max_call_duration_ms / 60000)} min</span>
                          </div>
                        )}
                        {selectedAgent.end_call_after_silence_ms && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">End After Silence</span>
                            <span className="text-xs font-medium text-gray-700">{Math.round(selectedAgent.end_call_after_silence_ms / 1000)} sec</span>
                          </div>
                        )}
                        {selectedAgent.enable_backchannel !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Backchannel</span>
                            <span className={`text-xs font-medium ${selectedAgent.enable_backchannel ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {selectedAgent.enable_backchannel ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Edit in Retell */}
                      <a
                        href="https://beta.retellai.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition border border-violet-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Edit Voice Settings in Retell Dashboard
                      </a>
                    </div>
                  ) : (
                    /* ── Agent Details Panel ── */
                    <div className="p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                      {/* Quick Info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-[9px] text-gray-400 mb-0.5">Language</p>
                          <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                            {getLanguageLabel(selectedAgent.language || 'en').flag} {getLanguageLabel(selectedAgent.language || 'en').label}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-[9px] text-gray-400 mb-0.5">Voice</p>
                          <p className="text-sm font-medium text-gray-800">{getVoiceName(selectedAgent.voice_id)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-[9px] text-gray-400 mb-0.5">Provider</p>
                          <p className="text-sm font-medium text-gray-800">{getVoiceProvider(selectedAgent.voice_id)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-[9px] text-gray-400 mb-0.5">Status</p>
                          <p className={`text-sm font-medium ${activeAgentId === selectedAgent.agent_id ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {activeAgentId === selectedAgent.agent_id ? '● Active' : '○ Inactive'}
                          </p>
                        </div>
                      </div>

                      {/* Voice Model & Speed */}
                      <div className="p-3 bg-violet-50/50 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                          <Volume2 className="h-3.5 w-3.5" /> Voice Settings
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-white rounded-lg">
                            <p className="text-[9px] text-gray-400">Speed</p>
                            <p className="text-sm font-bold text-gray-800">{selectedAgent.voice_speed?.toFixed(1) ?? '1.0'}</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg">
                            <p className="text-[9px] text-gray-400">Temp</p>
                            <p className="text-sm font-bold text-gray-800">{selectedAgent.voice_temperature?.toFixed(1) ?? '1.0'}</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg">
                            <p className="text-[9px] text-gray-400">Volume</p>
                            <p className="text-sm font-bold text-gray-800">{(selectedAgent.volume ?? selectedAgent.voice_volume)?.toFixed(1) ?? '1.0'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowSettings(true)}
                          className="flex items-center justify-center gap-1.5 w-full mt-2 px-3 py-2 text-xs font-medium text-violet-600 bg-white hover:bg-violet-50 rounded-lg transition border border-violet-200"
                        >
                          <Settings className="h-3 w-3" /> View Full Voice Settings
                        </button>
                      </div>

                      {/* Begin Message */}
                      {selectedAgent.begin_message && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-600 mb-1.5">Opening Message</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{selectedAgent.begin_message}</p>
                        </div>
                      )}

                      {/* General Prompt Preview */}
                      {selectedAgent.general_prompt && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-600 mb-1.5">Agent Prompt</p>
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-6">
                            {selectedAgent.general_prompt}
                          </p>
                        </div>
                      )}

                      {/* Last Modified */}
                      {selectedAgent.last_modification_timestamp && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last modified: {new Date(selectedAgent.last_modification_timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}

                      {/* Agent ID */}
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-[9px] text-gray-400 mb-0.5">Agent ID</p>
                        <p className="text-xs font-mono text-gray-600 break-all">{selectedAgent.agent_id}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSetActive(selectedAgent.agent_id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl transition ${
                            activeAgentId === selectedAgent.agent_id
                              ? 'bg-emerald-500 text-white'
                              : 'text-white'
                          }`}
                          style={activeAgentId !== selectedAgent.agent_id ? { background: C.violet.main } : undefined}
                        >
                          {activeAgentId === selectedAgent.agent_id ? (
                            <><CheckCircle className="h-3.5 w-3.5" /> Active in CRM</>
                          ) : (
                            <><Zap className="h-3.5 w-3.5" /> Set as Active Agent</>
                          )}
                        </button>
                        <Link
                          href={`/admin/crm/calls/templates?agent=${selectedAgent.agent_id}`}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                        >
                          <Phone className="h-3.5 w-3.5" /> Call Scripts
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
