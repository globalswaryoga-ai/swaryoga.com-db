'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  PhoneIncoming, PhoneOutgoing, Mic, FileText, ShieldCheck, ShieldX,
  MessageSquare, Volume2, CheckCircle, Clock, Send, Search, RefreshCw,
  ChevronDown, ChevronRight, ChevronLeft, X, Plus, Loader2,
  Users, Eye, Bot, Star, CalendarClock, ThumbsUp, ThumbsDown,
  ZoomIn, ZoomOut, Play, Pause, BarChart3, Sparkles, Trash2,
} from 'lucide-react';

// ── Color palette (matches funnel) ──
const COLORS = {
  indigo: { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
  blue: { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  cyan: { main: '#06B6D4', light: '#22D3EE', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
  violet: { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
  amber: { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  pink: { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  orange: { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  teal: { main: '#14B8A6', light: '#2DD4BF', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)' },
};

// ── Workflow stages for sidebar ──
const INBOUND_STAGES = [
  { key: 'all', label: 'All', icon: Users, color: COLORS.indigo },
  { key: 'new', label: 'New Recording', icon: Mic, color: COLORS.blue },
  { key: 'transcribed', label: 'Transcribed', icon: FileText, color: COLORS.cyan },
  { key: 'rules_set', label: 'Rules Set', icon: ShieldCheck, color: COLORS.violet },
  { key: 'answer_ready', label: 'Answer Ready', icon: MessageSquare, color: COLORS.amber },
  { key: 'voice_ready', label: 'Voice Ready', icon: Volume2, color: COLORS.orange },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: COLORS.emerald },
  { key: 'completed', label: 'Sent / Done', icon: Send, color: COLORS.pink },
];

const OUTBOUND_STAGES = [
  { key: 'all', label: 'All', icon: Users, color: COLORS.indigo },
  { key: 'new', label: 'New Query', icon: MessageSquare, color: COLORS.blue },
  { key: 'transcribed', label: 'Script Written', icon: FileText, color: COLORS.cyan },
  { key: 'rules_set', label: 'Rules Set', icon: ShieldCheck, color: COLORS.violet },
  { key: 'voice_ready', label: 'Voice Ready', icon: Volume2, color: COLORS.orange },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: COLORS.emerald },
  { key: 'scheduled', label: 'Scheduled', icon: CalendarClock, color: COLORS.amber },
  { key: 'completed', label: 'Completed', icon: Send, color: COLORS.pink },
];

interface CallWorkflow {
  _id: string;
  leadId: string;
  direction: 'inbound' | 'outbound';
  workflowStatus: string;
  voiceRecordingUrl?: string;
  transcribedText?: string;
  lastQuery?: string;
  scriptText?: string;
  rules?: string;
  preparedAnswer?: string;
  voiceUrl?: string;
  adminApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  scheduledAt?: string;
  aiFeedback?: {
    summary?: string;
    sentiment?: string;
    suggestions?: string[];
    score?: number;
    analysedAt?: string;
  };
  leadSnapshot?: { name?: string; phone?: string; funnelStage?: string; country?: string };
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CallWorkflowPage() {
  const router = useRouter();
  const token = useAuth();

  // ── State ──
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [activeStatus, setActiveStatus] = useState('all');
  const [workflows, setWorkflows] = useState<CallWorkflow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Editing
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  // Add workflow modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addLeads, setAddLeads] = useState<any[]>([]);
  const [addLeadIds, setAddLeadIds] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);

  // Text zoom
  const [textSize, setTextSize] = useState(14);

  const selectAll = selectedIds.size === workflows.length && workflows.length > 0;
  const stages = direction === 'inbound' ? INBOUND_STAGES : OUTBOUND_STAGES;

  // ── Fetch workflows ──
  const fetchWorkflows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ direction });
      if (activeStatus !== 'all') params.set('status', activeStatus);
      const res = await fetch(`/api/admin/crm/call-workflows?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setWorkflows(json.data?.workflows || []);
        setCounts(json.data?.counts || {});
        setTotal(json.data?.total || 0);
      }
    } catch (e) {
      console.error('fetch workflows error:', e);
    }
    setLoading(false);
  }, [token, direction, activeStatus]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Reset selection when direction/status changes
  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedIds(new Set());
  }, [direction, activeStatus]);

  // ── Update workflow field ──
  const updateWorkflow = async (id: string, updates: Record<string, any>) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/call-workflows', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.data?.workflow;
        if (updated) {
          setWorkflows(prev => prev.map(w => w._id === id ? { ...w, ...updated } : w));
        }
        // Refresh counts
        fetchWorkflows();
      }
    } catch (e) {
      console.error('update workflow error:', e);
    }
    setSaving(false);
    setEditingField(null);
  };

  // ── Search leads for adding ──
  const searchLeads = async (q: string) => {
    if (!token || q.length < 2) { setAddLeads([]); return; }
    setAddLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/leads?search=${encodeURIComponent(q)}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setAddLeads(json.data?.leads || json.leads || []);
      }
    } catch (e) { console.error(e); }
    setAddLoading(false);
  };

  // ── Create workflows for selected leads ──
  const createWorkflows = async () => {
    if (!token || addLeadIds.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/call-workflows', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(addLeadIds), direction }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddLeadIds(new Set());
        setAddSearch('');
        setAddLeads([]);
        fetchWorkflows();
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // ── Bulk call ──
  const bulkStartCalls = async () => {
    if (!token || selectedIds.size === 0) return;
    const approved = workflows.filter(w => selectedIds.has(w._id) && w.adminApproved);
    if (approved.length === 0) {
      alert('No approved workflows selected. Please approve first.');
      return;
    }
    // Start calls for each approved workflow
    for (const w of approved) {
      try {
        const body: any = {
          leadId: w.leadId,
          purpose: 'answer_questions',
          language: 'hi',
        };
        if (w.preparedAnswer || w.scriptText) {
          body.customPrompt = w.preparedAnswer || w.scriptText;
        }
        await fetch('/api/admin/crm/calls', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        // Mark as completed
        await updateWorkflow(w._id, { workflowStatus: 'completed' });
      } catch (e) {
        console.error('bulk call error:', e);
      }
    }
    fetchWorkflows();
  };

  // ── Toggle expand card ──
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Toggle select ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workflows.map(w => w._id)));
    }
  };

  // ── Format helpers ──
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '';
  const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const statusLabel = (s: string) => stages.find(st => st.key === s)?.label || s;

  // ------------------------------------------------
  //  RENDER
  // ------------------------------------------------
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      {/* ══════════ LEFT SIDEBAR ══════════ */}
      <aside
        className={`${sidebarCollapsed ? 'w-16' : 'w-60'} flex-shrink-0 flex flex-col border-r border-gray-100 bg-white transition-all duration-200`}
      >
        {/* Sidebar header */}
        <div className="px-3 py-3 flex items-center gap-2 border-b border-gray-100">
          {!sidebarCollapsed && (
            <h2 className="text-sm font-bold text-gray-800 flex-1 truncate">
              {direction === 'inbound' ? '📞 Incoming' : '📤 Outgoing'} Steps
            </h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Stage buttons */}
        <div className="flex-1 overflow-y-auto">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const count = stage.key === 'all' ? (counts['all'] || 0) : (counts[stage.key] || 0);
            const isActive = activeStatus === stage.key;

            return (
              <button
                key={stage.key}
                onClick={() => setActiveStatus(stage.key)}
                className={`w-full px-3 py-3 flex items-center gap-3 transition text-left border-b border-gray-50 ${
                  isActive ? '' : 'hover:bg-gray-50/80'
                }`}
                style={{
                  backgroundColor: isActive ? stage.color.bg : undefined,
                  borderLeft: isActive ? `3px solid ${stage.color.main}` : '3px solid transparent',
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${stage.color.main}, ${stage.color.light})` }}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-800 truncate">{stage.label}</div>
                    <div className="text-[10px] text-gray-400">{count}</div>
                  </div>
                )}
                {!sidebarCollapsed && (
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: stage.color.main }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add workflow button */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-t border-gray-100 space-y-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Leads to Pipeline
            </button>
            <button
              onClick={() => router.push('/admin/crm/funnel/manage')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Funnel
            </button>
          </div>
        )}
      </aside>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/crm')}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-80 transition shadow-sm"
                style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
                title="Back to CRM"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Call Workflow Manager</h1>
                <p className="text-xs text-gray-400">
                  {total} {direction === 'inbound' ? 'incoming' : 'outgoing'} calls
                  {activeStatus !== 'all' && ` · ${statusLabel(activeStatus)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Bulk actions when selected */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06))' }}>
                  <span className="text-[11px] font-semibold text-indigo-700 whitespace-nowrap">
                    {selectedIds.size} selected
                  </span>
                  <div className="h-3.5 w-px bg-indigo-200" />
                  <button
                    onClick={bulkStartCalls}
                    title="Start AI Calls for approved"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white transition hover:opacity-90"
                    style={{ background: COLORS.emerald.main }}
                  >
                    <PhoneOutgoing className="h-3 w-3" /> Call
                  </button>
                  <button
                    onClick={() => {
                      // Bulk approve
                      selectedIds.forEach(id => updateWorkflow(id, { adminApproved: true }));
                    }}
                    title="Bulk Approve"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-green-50 text-green-600 hover:bg-green-100 transition"
                  >
                    <ThumbsUp className="h-3 w-3" /> Approve
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    title="Clear selection"
                    className="flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Direction toggle */}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => { setDirection('inbound'); setActiveStatus('all'); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition ${
                    direction === 'inbound' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <PhoneIncoming className="h-3.5 w-3.5" /> Incoming
                </button>
                <button
                  onClick={() => { setDirection('outbound'); setActiveStatus('all'); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition ${
                    direction === 'outbound' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <PhoneOutgoing className="h-3.5 w-3.5" /> Outgoing
                </button>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-xl px-1.5 py-1">
                <button onClick={() => setTextSize(s => Math.max(10, s - 2))} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Zoom out">
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] text-gray-400 w-6 text-center">{textSize}</span>
                <button onClick={() => setTextSize(s => Math.min(24, s + 2))} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Zoom in">
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                onClick={fetchWorkflows}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition shadow-sm"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-2" />
              <p className="text-sm text-gray-400">Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <PhoneIncoming className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No workflows yet</p>
              <p className="text-xs mt-1">Click &quot;Add Leads to Pipeline&quot; to get started</p>
            </div>
          ) : (
            <>
              {/* Select all header */}
              <div className="flex items-center gap-3 px-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-500">Select all ({workflows.length})</span>
              </div>

              {/* Workflow cards */}
              {workflows.map((w) => {
                const expanded = expandedIds.has(w._id);
                const isSelected = selectedIds.has(w._id);
                const stageInfo = stages.find(s => s.key === w.workflowStatus);
                const stageColor = stageInfo?.color || COLORS.blue;

                return (
                  <div
                    key={w._id}
                    className={`bg-white rounded-2xl border transition-all shadow-sm ${
                      isSelected ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(w._id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                      />
                      <button onClick={() => toggleExpand(w._id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: stageColor.bg }}>
                          {stageInfo ? <stageInfo.icon className="h-4 w-4" style={{ color: stageColor.main }} /> : <Mic className="h-4 w-4 text-gray-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {w.leadSnapshot?.name || 'Unknown Lead'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: stageColor.bg, color: stageColor.main }}>
                              {statusLabel(w.workflowStatus)}
                            </span>
                            {w.adminApproved && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-600">
                                ✅ Approved
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                            <span>{w.leadSnapshot?.phone}</span>
                            {w.leadSnapshot?.country && <span>· {w.leadSnapshot.country}</span>}
                            {w.leadSnapshot?.funnelStage && <span>· {w.leadSnapshot.funnelStage}</span>}
                            <span>· {fmtDate(w.createdAt)}</span>
                          </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Expanded workflow rows */}
                    {expanded && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {direction === 'inbound' ? (
                          <InboundRows w={w} textSize={textSize} editingField={editingField} editText={editText}
                            setEditingField={setEditingField} setEditText={setEditText}
                            saving={saving} updateWorkflow={updateWorkflow} />
                        ) : (
                          <OutboundRows w={w} textSize={textSize} editingField={editingField} editText={editText}
                            setEditingField={setEditingField} setEditText={setEditText}
                            saving={saving} updateWorkflow={updateWorkflow} />
                        )}

                        {/* AI Feedback row (common) */}
                        <WorkflowRow
                          icon={Bot}
                          color={COLORS.violet}
                          label="AI Feedback"
                          step={direction === 'inbound' ? 8 : 7}
                        >
                          {w.aiFeedback?.summary ? (
                            <div className="space-y-1" style={{ fontSize: textSize }}>
                              <div className="flex items-center gap-2">
                                {w.aiFeedback.sentiment === 'positive' && <span className="text-green-500 text-xs">😊 Positive</span>}
                                {w.aiFeedback.sentiment === 'neutral' && <span className="text-gray-500 text-xs">😐 Neutral</span>}
                                {w.aiFeedback.sentiment === 'negative' && <span className="text-red-500 text-xs">😟 Negative</span>}
                                {w.aiFeedback.score != null && (
                                  <span className="text-xs text-indigo-600 font-semibold">Score: {w.aiFeedback.score}/100</span>
                                )}
                              </div>
                              <p className="text-gray-700 text-sm">{w.aiFeedback.summary}</p>
                              {w.aiFeedback.suggestions && w.aiFeedback.suggestions.length > 0 && (
                                <ul className="text-xs text-gray-500 list-disc list-inside mt-1">
                                  {w.aiFeedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">AI analysis will appear here after the call is completed</p>
                          )}
                        </WorkflowRow>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </main>

      {/* ══════════ ADD LEADS MODAL ══════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Add Leads to {direction === 'inbound' ? 'Incoming' : 'Outgoing'} Pipeline</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={addSearch}
                  onChange={e => { setAddSearch(e.target.value); searchLeads(e.target.value); }}
                  placeholder="Search lead by name or phone..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-1">
              {addLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                </div>
              ) : addLeads.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  {addSearch.length >= 2 ? 'No leads found' : 'Type at least 2 characters to search'}
                </p>
              ) : (
                addLeads.map((lead: any) => {
                  const isChecked = addLeadIds.has(lead._id);
                  return (
                    <label
                      key={lead._id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition ${
                        isChecked ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setAddLeadIds(prev => {
                            const next = new Set(prev);
                            next.has(lead._id) ? next.delete(lead._id) : next.add(lead._id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-800 truncate">{lead.displayName || lead.name}</div>
                        <div className="text-[11px] text-gray-400">{lead.phoneNumber} {lead.country && `· ${lead.country}`}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {addLeadIds.size > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={createWorkflows}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add {addLeadIds.size} Lead{addLeadIds.size > 1 ? 's' : ''} to Pipeline
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ════════════════════════════════════════════════════════════

/** Wrapper for each workflow row */
function WorkflowRow({ icon: Icon, color, label, step, children }: {
  icon: any; color: any; label: string; step: number; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color.bg }}>
          <Icon className="h-3.5 w-3.5" style={{ color: color.main }} />
        </div>
        <span className="text-[9px] text-gray-300 font-medium">#{step}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
        {children}
      </div>
    </div>
  );
}

/** Editable text field */
function EditableTextField({ value, placeholder, field, workflowId, textSize, editingField, editText, setEditingField, setEditText, saving, updateWorkflow }: {
  value?: string; placeholder: string; field: string; workflowId: string; textSize: number;
  editingField: { id: string; field: string } | null; editText: string;
  setEditingField: (v: any) => void; setEditText: (v: string) => void;
  saving: boolean; updateWorkflow: (id: string, updates: any) => Promise<void>;
}) {
  const isEditing = editingField?.id === workflowId && editingField?.field === field;

  if (isEditing) {
    return (
      <div className="space-y-1.5">
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none"
          style={{ fontSize: textSize }}
          autoFocus
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => updateWorkflow(workflowId, { [field]: editText })}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />} Save
          </button>
          <button
            onClick={() => setEditingField(null)}
            className="px-3 py-1 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => { setEditingField({ id: workflowId, field }); setEditText(value || ''); }}
      className="cursor-pointer rounded-xl px-3 py-2 border border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition min-h-[40px]"
    >
      {value ? (
        <p className="text-gray-700 whitespace-pre-wrap" style={{ fontSize: textSize }}>{value}</p>
      ) : (
        <p className="text-gray-300 italic text-xs">{placeholder}</p>
      )}
    </div>
  );
}

/** INBOUND ROWS */
function InboundRows({ w, textSize, editingField, editText, setEditingField, setEditText, saving, updateWorkflow }: {
  w: CallWorkflow; textSize: number;
  editingField: { id: string; field: string } | null; editText: string;
  setEditingField: (v: any) => void; setEditText: (v: string) => void;
  saving: boolean; updateWorkflow: (id: string, updates: any) => Promise<void>;
}) {
  return (
    <>
      {/* Row 1: Voice Recording */}
      <WorkflowRow icon={Mic} color={COLORS.blue} label="Voice Recording (Incoming Question)" step={1}>
        {w.voiceRecordingUrl ? (
          <audio controls src={w.voiceRecordingUrl} className="w-full h-8 rounded-lg" />
        ) : (
          <EditableTextField
            value={w.voiceRecordingUrl} placeholder="Paste voice recording URL or upload link..."
            field="voiceRecordingUrl" workflowId={w._id} textSize={textSize}
            editingField={editingField} editText={editText} setEditingField={setEditingField}
            setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
          />
        )}
      </WorkflowRow>

      {/* Row 2: Transcribed Text */}
      <WorkflowRow icon={FileText} color={COLORS.cyan} label="Transcribed Text" step={2}>
        <EditableTextField
          value={w.transcribedText} placeholder="Type or paste the transcription of the voice recording..."
          field="transcribedText" workflowId={w._id} textSize={textSize}
          editingField={editingField} editText={editText} setEditingField={setEditingField}
          setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
        />
      </WorkflowRow>

      {/* Row 3: Rules (Do's & Don'ts) */}
      <WorkflowRow icon={ShieldCheck} color={COLORS.violet} label="Rules — Do's & Don'ts" step={3}>
        <EditableTextField
          value={w.rules} placeholder="✅ Do: Be polite, mention workshop dates\n❌ Don't: Share pricing on phone, make promises"
          field="rules" workflowId={w._id} textSize={textSize}
          editingField={editingField} editText={editText} setEditingField={setEditingField}
          setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
        />
      </WorkflowRow>

      {/* Row 4: Prepared Answer Text */}
      <WorkflowRow icon={MessageSquare} color={COLORS.amber} label="Prepared Answer" step={4}>
        <EditableTextField
          value={w.preparedAnswer} placeholder="Write the prepared answer to send back to the lead..."
          field="preparedAnswer" workflowId={w._id} textSize={textSize}
          editingField={editingField} editText={editText} setEditingField={setEditingField}
          setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
        />
      </WorkflowRow>

      {/* Row 5: Convert to Voice */}
      <WorkflowRow icon={Volume2} color={COLORS.orange} label="Convert to Voice" step={5}>
        {w.voiceUrl ? (
          <div className="space-y-1">
            <audio controls src={w.voiceUrl} className="w-full h-8 rounded-lg" />
            <p className="text-[10px] text-gray-400">Voice file ready</p>
          </div>
        ) : (
          <EditableTextField
            value={w.voiceUrl} placeholder="Paste generated voice URL here (after text-to-voice conversion)..."
            field="voiceUrl" workflowId={w._id} textSize={textSize}
            editingField={editingField} editText={editText} setEditingField={setEditingField}
            setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
          />
        )}
      </WorkflowRow>

      {/* Row 6: Admin Approval */}
      <WorkflowRow icon={CheckCircle} color={COLORS.emerald} label="Admin Approval" step={6}>
        <AdminApprovalRow w={w} saving={saving} updateWorkflow={updateWorkflow} />
      </WorkflowRow>

      {/* Row 7: Ready to Send */}
      <WorkflowRow icon={Send} color={COLORS.pink} label="Ready to Send" step={7}>
        <ReadyToSendRow w={w} saving={saving} updateWorkflow={updateWorkflow} />
      </WorkflowRow>
    </>
  );
}

/** OUTBOUND ROWS */
function OutboundRows({ w, textSize, editingField, editText, setEditingField, setEditText, saving, updateWorkflow }: {
  w: CallWorkflow; textSize: number;
  editingField: { id: string; field: string } | null; editText: string;
  setEditingField: (v: any) => void; setEditText: (v: string) => void;
  saving: boolean; updateWorkflow: (id: string, updates: any) => Promise<void>;
}) {
  return (
    <>
      {/* Row 1: Last Query / Context */}
      <WorkflowRow icon={MessageSquare} color={COLORS.blue} label="Last Query / Question" step={1}>
        <EditableTextField
          value={w.lastQuery} placeholder="What was the lead's last question or context for this call?"
          field="lastQuery" workflowId={w._id} textSize={textSize}
          editingField={editingField} editText={editText} setEditingField={setEditingField}
          setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
        />
      </WorkflowRow>

      {/* Row 2: Write Script */}
      <WorkflowRow icon={FileText} color={COLORS.cyan} label="Call Script — What to Say" step={2}>
        <EditableTextField
          value={w.scriptText} placeholder="Write the complete script for this outbound call..."
          field="scriptText" workflowId={w._id} textSize={textSize}
          editingField={editingField} editText={editText} setEditingField={setEditingField}
          setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
        />
      </WorkflowRow>

      {/* Row 3: Rules (Do's & Don'ts) */}
      <WorkflowRow icon={ShieldCheck} color={COLORS.violet} label="Rules — Do's & Don'ts" step={3}>
        <EditableTextField
          value={w.rules} placeholder="✅ Do: Be warm, ask about health\n❌ Don't: Push for payment, talk too fast"
          field="rules" workflowId={w._id} textSize={textSize}
          editingField={editingField} editText={editText} setEditingField={setEditingField}
          setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
        />
      </WorkflowRow>

      {/* Row 4: Convert to Voice */}
      <WorkflowRow icon={Volume2} color={COLORS.orange} label="Convert to Voice" step={4}>
        {w.voiceUrl ? (
          <div className="space-y-1">
            <audio controls src={w.voiceUrl} className="w-full h-8 rounded-lg" />
            <p className="text-[10px] text-gray-400">Voice file ready</p>
          </div>
        ) : (
          <EditableTextField
            value={w.voiceUrl} placeholder="Paste generated voice URL here..."
            field="voiceUrl" workflowId={w._id} textSize={textSize}
            editingField={editingField} editText={editText} setEditingField={setEditingField}
            setEditText={setEditText} saving={saving} updateWorkflow={updateWorkflow}
          />
        )}
      </WorkflowRow>

      {/* Row 5: Admin Approval */}
      <WorkflowRow icon={CheckCircle} color={COLORS.emerald} label="Admin Approval" step={5}>
        <AdminApprovalRow w={w} saving={saving} updateWorkflow={updateWorkflow} />
      </WorkflowRow>

      {/* Row 6: Schedule */}
      <WorkflowRow icon={CalendarClock} color={COLORS.amber} label="Schedule Call" step={6}>
        <ScheduleRow w={w} saving={saving} updateWorkflow={updateWorkflow} />
      </WorkflowRow>
    </>
  );
}

/** Admin approval sub-row */
function AdminApprovalRow({ w, saving, updateWorkflow }: {
  w: CallWorkflow; saving: boolean;
  updateWorkflow: (id: string, updates: any) => Promise<void>;
}) {
  if (w.adminApproved) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5" /> Approved by {w.approvedBy || 'admin'}
        </span>
        {w.approvedAt && <span className="text-[10px] text-gray-400">on {new Date(w.approvedAt).toLocaleDateString('en-IN')}</span>}
        <button
          onClick={() => updateWorkflow(w._id, { adminApproved: false })}
          className="ml-auto text-[10px] text-red-400 hover:text-red-600"
          title="Revoke approval"
        >
          Revoke
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => updateWorkflow(w._id, { adminApproved: true })}
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}
      >
        <ThumbsUp className="h-3 w-3" /> Approve
      </button>
      <span className="text-[10px] text-gray-400">Review all steps above before approving</span>
    </div>
  );
}

/** Ready to send sub-row (inbound) */
function ReadyToSendRow({ w, saving, updateWorkflow }: {
  w: CallWorkflow; saving: boolean;
  updateWorkflow: (id: string, updates: any) => Promise<void>;
}) {
  if (w.workflowStatus === 'completed') {
    return (
      <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
        <CheckCircle className="h-3.5 w-3.5" /> Sent / Completed
      </span>
    );
  }

  if (!w.adminApproved) {
    return <p className="text-[10px] text-gray-400 italic">Needs admin approval first (step 6)</p>;
  }

  return (
    <button
      onClick={() => updateWorkflow(w._id, { workflowStatus: 'completed' })}
      disabled={saving}
      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #EC4899, #F472B6)' }}
    >
      <Send className="h-3 w-3" /> Mark as Sent
    </button>
  );
}

/** Schedule sub-row (outbound) */
function ScheduleRow({ w, saving, updateWorkflow }: {
  w: CallWorkflow; saving: boolean;
  updateWorkflow: (id: string, updates: any) => Promise<void>;
}) {
  const [date, setDate] = useState(w.scheduledAt ? new Date(w.scheduledAt).toISOString().slice(0, 16) : '');

  if (w.workflowStatus === 'completed') {
    return (
      <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
        <CheckCircle className="h-3.5 w-3.5" /> Call Completed
      </span>
    );
  }

  if (!w.adminApproved) {
    return <p className="text-[10px] text-gray-400 italic">Needs admin approval first (step 5)</p>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="datetime-local"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
      />
      <button
        onClick={() => { if (date) updateWorkflow(w._id, { scheduledAt: new Date(date).toISOString() }); }}
        disabled={saving || !date}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}
      >
        <CalendarClock className="h-3 w-3" /> Schedule
      </button>
      {w.scheduledAt && (
        <span className="text-[10px] text-amber-600 font-medium">
          Scheduled: {new Date(w.scheduledAt).toLocaleString('en-IN')}
        </span>
      )}
    </div>
  );
}
