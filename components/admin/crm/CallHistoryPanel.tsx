'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  X, ChevronLeft, ChevronDown, ChevronUp, Phone, Bot,
  PhoneCall, Clock, CheckCircle, XCircle, PhoneOff,
  MessageSquare, Volume2, Calendar, AlertTriangle,
  Play, Pause, Loader2, CalendarClock, Send,
} from 'lucide-react';

interface CallRecord {
  _id: string;
  retellCallId?: string;
  direction: string;
  purpose: string;
  customPrompt?: string;
  status: string;
  phoneNumber?: string;
  fromNumber?: string;
  language: string;
  duration: number;
  transcript?: string;
  summary?: string;
  sentiment?: string;
  callEndedReason?: string;
  recordingUrl?: string;
  collectedData?: Record<string, any>;
  crmUpdates?: Array<{ field: string; oldValue: any; newValue: any }>;
  startedAt?: string;
  endedAt?: string;
  initiatedBy?: string;
  createdAt: string;
}

interface CallHistoryPanelProps {
  leadId: string;
  leadName: string;
  leadPhone: string;
  token: string;
  onClose: () => void;
  onMakeCall: () => void;
}

const PURPOSE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  welcome:            { icon: '🙏', label: 'Welcome',       color: 'bg-orange-50 text-orange-700' },
  follow_up:          { icon: '📞', label: 'Follow-Up',     color: 'bg-indigo-50 text-indigo-700' },
  answer_questions:   { icon: '💬', label: 'Answer Back',   color: 'bg-violet-50 text-violet-700' },
  workshop_reminder:  { icon: '📅', label: 'Workshop',      color: 'bg-amber-50 text-amber-700' },
  collect_info:       { icon: '📋', label: 'Collect Info',  color: 'bg-cyan-50 text-cyan-700' },
  payment_reminder:   { icon: '💳', label: 'Payment',       color: 'bg-pink-50 text-pink-700' },
  custom:             { icon: '✏️', label: 'Custom',        color: 'bg-gray-50 text-gray-700' },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  completed:   { icon: CheckCircle,    color: 'text-green-600',  bg: 'bg-green-50' },
  failed:      { icon: XCircle,        color: 'text-red-600',    bg: 'bg-red-50' },
  no_answer:   { icon: PhoneOff,       color: 'text-orange-600', bg: 'bg-orange-50' },
  busy:        { icon: PhoneOff,       color: 'text-amber-600',  bg: 'bg-amber-50' },
  queued:      { icon: Clock,          color: 'text-gray-600',   bg: 'bg-gray-50' },
  ringing:     { icon: Phone,          color: 'text-indigo-600',   bg: 'bg-indigo-50' },
  in_progress: { icon: PhoneCall,      color: 'text-green-600',  bg: 'bg-green-50' },
  canceled:    { icon: XCircle,        color: 'text-gray-500',   bg: 'bg-gray-50' },
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDateTime(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) +
    ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isToday(d: string): boolean {
  const dt = new Date(d);
  const now = new Date();
  return dt.getDate() === now.getDate() && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
}

function sentimentEmoji(s?: string): string {
  if (s === 'positive') return '😊';
  if (s === 'negative') return '😟';
  return '😐';
}

// ── Period helpers ──
function isThisWeek(d: string): boolean {
  const dt = new Date(d);
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
  return dt >= start && dt <= now;
}
function isThisMonth(d: string): boolean {
  const dt = new Date(d);
  const now = new Date();
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
}
function isThisYear(d: string): boolean {
  return new Date(d).getFullYear() === new Date().getFullYear();
}

const COST_PER_MIN = 0.07; // USD per minute (Retell AI pricing)

function calcCost(durationSec: number): number {
  return (durationSec / 60) * COST_PER_MIN;
}

function fmtCost(usd: number): string {
  if (usd <= 0) return '$0';
  if (usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

// ── Single expandable call card ──
function CallCard({ call, defaultExpanded }: { call: CallRecord; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const statusCfg = STATUS_CONFIG[call.status] || STATUS_CONFIG.queued;
  const StatusIcon = statusCfg.icon;
  const purposeInfo = PURPOSE_LABELS[call.purpose] || PURPOSE_LABELS.custom;
  const isActive = ['queued', 'ringing', 'in_progress'].includes(call.status);
  const langLabel = call.language === 'hi-IN' || call.language === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English';

  const toggleAudio = () => {
    if (!call.recordingUrl) return;
    if (audioRef) {
      if (audioPlaying) { audioRef.pause(); setAudioPlaying(false); }
      else { audioRef.play(); setAudioPlaying(true); }
    } else {
      const a = new Audio(call.recordingUrl);
      a.onended = () => setAudioPlaying(false);
      a.play();
      setAudioPlaying(true);
      setAudioRef(a);
    }
  };

  // Parse transcript into conversation bubbles
  const transcriptLines = call.transcript
    ? call.transcript.split('\n').filter(l => l.trim()).map(line => {
        const agentMatch = line.match(/^(Agent|Sakshi|AI|Bot|assistant)\s*:\s*(.*)/i);
        const userMatch = line.match(/^(User|Customer|Lead|Caller|human)\s*:\s*(.*)/i);
        if (agentMatch) return { role: 'agent' as const, text: agentMatch[2] };
        if (userMatch) return { role: 'user' as const, text: userMatch[2] };
        return { role: 'unknown' as const, text: line };
      })
    : [];

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isActive ? 'border-green-200 bg-green-50/30 shadow-sm' : 'border-gray-100 hover:border-gray-200'
    }`}>
      {/* Card Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        {/* Status dot — blinking only for active broadcast/scheduled calls */}
        <div className="relative flex-shrink-0">
          {isActive && <span className="block w-2.5 h-2.5 rounded-full bg-green-500 animate-ping absolute" />}
          <span className={`block w-2.5 h-2.5 rounded-full ${
            isActive ? 'bg-green-500'
            : call.status === 'completed' ? 'bg-green-400'
            : call.status === 'ringing' ? 'bg-green-400'
            : call.status === 'failed' ? 'bg-red-400'
            : call.status === 'no_answer' ? 'bg-red-400'
            : call.status === 'busy' ? 'bg-red-400'
            : call.status === 'canceled' ? 'bg-red-400'
            : 'bg-gray-300'
          }`} />
        </div>

        {/* Status badge */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusCfg.bg} ${statusCfg.color}`}>
          <StatusIcon className="h-3 w-3" />
          {call.status.replace(/_/g, ' ')}
        </span>

        {/* Purpose */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${purposeInfo.color}`}>
          {purposeInfo.icon} {purposeInfo.label}
        </span>

        {/* Language */}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500">{langLabel}</span>

        {/* Duration */}
        {call.duration > 0 && (
          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
            <Clock className="h-3 w-3" /> {formatDuration(call.duration)}
          </span>
        )}

        {/* Sentiment */}
        {call.sentiment && <span className="text-sm">{sentimentEmoji(call.sentiment)}</span>}

        {/* Time */}
        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
          {isToday(call.createdAt) ? formatTime(call.createdAt) : formatDateTime(call.createdAt)}
        </span>

        {/* Expand icon */}
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-gray-50">
          {/* Summary */}
          {call.summary && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> AI Summary
              </p>
              <p className="text-xs text-gray-700 bg-indigo-50/50 rounded-lg px-3 py-2 leading-relaxed">{call.summary}</p>
            </div>
          )}

          {/* Call ended reason */}
          {call.callEndedReason && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <PhoneOff className="h-3 w-3 text-gray-400" />
              <span className="font-medium">Ended:</span> {call.callEndedReason}
            </div>
          )}

          {/* Recording player */}
          {call.recordingUrl && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Volume2 className="h-3 w-3" /> Recording
              </p>
              <div className="flex items-center gap-2">
                <button onClick={toggleAudio} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                  {audioPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {audioPlaying ? 'Pause' : 'Play Recording'}
                </button>
                {call.duration > 0 && <span className="text-[10px] text-gray-400">{formatDuration(call.duration)}</span>}
              </div>
            </div>
          )}

          {/* Transcript — chat bubbles */}
          {transcriptLines.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Conversation
              </p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {transcriptLines.map((line, i) => (
                  <div key={i} className={`flex ${line.role === 'agent' ? 'justify-start' : line.role === 'user' ? 'justify-end' : 'justify-center'}`}>
                    {line.role === 'unknown' ? (
                      <p className="text-[10px] text-gray-400 italic">{line.text}</p>
                    ) : (
                      <div className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${
                        line.role === 'agent'
                          ? 'bg-indigo-50 text-indigo-800 rounded-tl-sm'
                          : 'bg-emerald-50 text-emerald-800 rounded-tr-sm'
                      }`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mb-0.5">
                          {line.role === 'agent' ? '🤖 Sakshi' : '👤 Lead'}
                        </span>
                        {line.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw transcript fallback if no structured lines parsed */}
          {call.transcript && transcriptLines.length === 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Transcript
              </p>
              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">{call.transcript}</p>
            </div>
          )}

          {/* Collected Data */}
          {call.collectedData && Object.keys(call.collectedData).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">📋 Collected Info</p>
              <div className="bg-amber-50/50 rounded-lg px-3 py-2 space-y-1">
                {Object.entries(call.collectedData).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-400 font-medium capitalize">{k.replace(/_/g, ' ')}:</span>
                    <span className="text-gray-700">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CRM Updates */}
          {call.crmUpdates && call.crmUpdates.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">🔄 CRM Updates</p>
              <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                {call.crmUpdates.map((u, i) => (
                  <div key={i} className="text-[11px] text-gray-600 flex items-center gap-1.5">
                    <span className="text-gray-400 font-medium">{u.field}:</span>
                    <span className="line-through text-red-400">{String(u.oldValue || '—')}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 font-medium">{String(u.newValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 pt-1 border-t border-gray-50">
            {call.phoneNumber && <span>📱 {call.phoneNumber}</span>}
            {call.direction && <span>{call.direction === 'inbound' ? '📥 Inbound' : '📤 Outbound'}</span>}
            {call.initiatedBy && <span>👤 {call.initiatedBy}</span>}
            {call.startedAt && <span>Start: {formatTime(call.startedAt)}</span>}
            {call.endedAt && <span>End: {formatTime(call.endedAt)}</span>}
            {call.retellCallId && <span className="font-mono text-[9px] opacity-60">ID: {call.retellCallId.slice(0, 12)}...</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──
export default function CallHistoryPanel({ leadId, leadName, leadPhone, token, onClose, onMakeCall }: CallHistoryPanelProps) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'completed' | 'failed'>('all');

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/calls?leadId=${leadId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCalls(json.data?.calls || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [leadId, token]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  // Auto-refresh every 10s if any call is active
  useEffect(() => {
    const hasActive = calls.some(c => ['queued', 'ringing', 'in_progress'].includes(c.status));
    if (!hasActive) return;
    const interval = setInterval(fetchCalls, 10000);
    return () => clearInterval(interval);
  }, [calls, fetchCalls]);

  // Stats
  const stats = {
    total: calls.length,
    completed: calls.filter(c => c.status === 'completed').length,
    failed: calls.filter(c => ['failed', 'no_answer', 'busy', 'canceled'].includes(c.status)).length,
    ringing: calls.filter(c => ['queued', 'ringing', 'in_progress'].includes(c.status)).length,
    active: calls.filter(c => ['queued', 'ringing', 'in_progress'].includes(c.status)).length,
    noAnswer: calls.filter(c => c.status === 'no_answer').length,
    today: calls.filter(c => isToday(c.createdAt)).length,
    totalDuration: calls.reduce((s, c) => s + (c.duration || 0), 0),
    // Period durations for cost
    todayDuration: calls.filter(c => isToday(c.createdAt)).reduce((s, c) => s + (c.duration || 0), 0),
    weekDuration: calls.filter(c => isThisWeek(c.createdAt)).reduce((s, c) => s + (c.duration || 0), 0),
    monthDuration: calls.filter(c => isThisMonth(c.createdAt)).reduce((s, c) => s + (c.duration || 0), 0),
    yearDuration: calls.filter(c => isThisYear(c.createdAt)).reduce((s, c) => s + (c.duration || 0), 0),
    // Period call counts
    weekCalls: calls.filter(c => isThisWeek(c.createdAt)).length,
    monthCalls: calls.filter(c => isThisMonth(c.createdAt)).length,
    yearCalls: calls.filter(c => isThisYear(c.createdAt)).length,
    avgSentiment: (() => {
      const sentiments = calls.filter(c => c.sentiment).map(c => c.sentiment);
      const pos = sentiments.filter(s => s === 'positive').length;
      const neg = sentiments.filter(s => s === 'negative').length;
      if (!sentiments.length) return 'none';
      if (pos > neg) return 'positive';
      if (neg > pos) return 'negative';
      return 'neutral';
    })(),
  };

  // Filtered calls
  const filteredCalls = calls.filter(c => {
    if (filter === 'today') return isToday(c.createdAt);
    if (filter === 'completed') return c.status === 'completed';
    if (filter === 'failed') return ['failed', 'no_answer', 'busy', 'canceled'].includes(c.status);
    return true;
  });

  // Group by date
  const grouped: Record<string, CallRecord[]> = {};
  for (const call of filteredCalls) {
    const key = isToday(call.createdAt)
      ? 'Today'
      : new Date(call.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(call);
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-[520px] h-full bg-white shadow-xl flex flex-col border-l border-gray-100"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-white/20 transition flex-shrink-0">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-white/20 text-white">
            {(leadName || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{leadName || 'Unknown'}</p>
            <p className="text-indigo-200 text-[11px] flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> {leadPhone || '—'}
              {stats.active > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/30 text-green-200 text-[9px] font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> LIVE
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition flex-shrink-0">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/80">
          {/* Row 1 — Call counts */}
          <div className="grid grid-cols-6 gap-1 px-4 py-2.5">
            <div className="text-center">
              <p className="text-base font-bold text-gray-800">{stats.total}</p>
              <p className="text-[8px] text-gray-400 uppercase font-semibold">Total</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-green-600">{stats.completed}</p>
              <p className="text-[8px] text-gray-400 uppercase font-semibold">Done</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-red-500">{stats.failed}</p>
              <p className="text-[8px] text-gray-400 uppercase font-semibold">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-orange-500">{stats.noAnswer}</p>
              <p className="text-[8px] text-gray-400 uppercase font-semibold">No Ans</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-indigo-500">{stats.ringing}</p>
              <p className="text-[8px] text-gray-400 uppercase font-semibold">Active</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-indigo-600">{formatDuration(stats.totalDuration)}</p>
              <p className="text-[8px] text-gray-400 uppercase font-semibold">Talk Time</p>
            </div>
          </div>
          {/* Row 2 — Cost breakdown by period */}
          <div className="grid grid-cols-4 gap-1 px-4 py-2 border-t border-gray-100">
            <div className="text-center px-1 py-1 rounded-lg bg-white border border-gray-50">
              <p className="text-xs font-bold text-emerald-600">{fmtCost(calcCost(stats.todayDuration))}</p>
              <p className="text-[7px] text-gray-400 uppercase font-semibold">Today <span className="text-gray-300">·</span> {stats.today} calls</p>
            </div>
            <div className="text-center px-1 py-1 rounded-lg bg-white border border-gray-50">
              <p className="text-xs font-bold text-indigo-600">{fmtCost(calcCost(stats.weekDuration))}</p>
              <p className="text-[7px] text-gray-400 uppercase font-semibold">Week <span className="text-gray-300">·</span> {stats.weekCalls} calls</p>
            </div>
            <div className="text-center px-1 py-1 rounded-lg bg-white border border-gray-50">
              <p className="text-xs font-bold text-violet-600">{fmtCost(calcCost(stats.monthDuration))}</p>
              <p className="text-[7px] text-gray-400 uppercase font-semibold">Month <span className="text-gray-300">·</span> {stats.monthCalls} calls</p>
            </div>
            <div className="text-center px-1 py-1 rounded-lg bg-white border border-gray-50">
              <p className="text-xs font-bold text-gray-700">{fmtCost(calcCost(stats.yearDuration))}</p>
              <p className="text-[7px] text-gray-400 uppercase font-semibold">Year <span className="text-gray-300">·</span> {stats.yearCalls} calls</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 flex gap-1">
          {([
            { key: 'all', label: 'All', count: stats.total },
            { key: 'today', label: 'Today', count: stats.today },
            { key: 'completed', label: 'Completed', count: stats.completed },
            { key: 'failed', label: 'Failed', count: stats.failed },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
                filter === tab.key
                  ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold ${
                filter === tab.key ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Call List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-gray-400 mt-2">Loading call history...</p>
              </div>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <PhoneCall className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No calls found</p>
              <p className="text-xs mt-1">
                {filter !== 'all'
                  ? 'Try a different filter or make a new call'
                  : 'Make the first AI call to this lead'}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, dateCalls]) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{date}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">{dateCalls.length}</span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>

                {/* Call cards */}
                <div className="space-y-1.5">
                  {dateCalls.map((call, idx) => (
                    <CallCard key={call._id} call={call} defaultExpanded={idx === 0 && date === 'Today'} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white flex gap-2">
          <button
            onClick={() => { onClose(); onMakeCall(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}
          >
            <Bot className="h-4 w-4" /> Make AI Call
          </button>
          <a
            href={`tel:${leadPhone || ''}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
          >
            <Phone className="h-4 w-4" /> PC Call
          </a>
          <button
            onClick={fetchCalls}
            className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 transition"
            title="Refresh"
          >
            <Send className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      </div>

      {/* Slide-in animation */}
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
