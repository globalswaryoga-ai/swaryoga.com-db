'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Phone, PhoneIncoming, PhoneOutgoing, Plus, Search,
  Edit3, Trash2, Copy, Check, X, ChevronDown, ChevronRight,
  ChevronLeft, Save, RefreshCw, ArrowLeft, Bot, Loader2,
  Mic, MicOff, FileText, Shield, ShieldCheck, ShieldAlert,
  Send, Clock, CheckCircle, XCircle, AlertCircle,
  Upload, Play, Pause, Volume2,
} from 'lucide-react';

// ── Colors ──
const C = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)' },
  orange:  { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)' },
  red:     { main: '#EF4444', light: '#F87171', bg: 'rgba(239,68,68,0.08)' },
  gray:    { main: '#6B7280', light: '#9CA3AF', bg: 'rgba(107,114,128,0.08)' },
};

const LANGUAGES = [
  { key: 'hi', label: 'Hindi',   flag: '🇮🇳', color: C.orange },
  { key: 'en', label: 'English', flag: '🇬🇧', color: C.blue },
  { key: 'mr', label: 'Marathi', flag: '🇮🇳', color: C.emerald },
  { key: 'ne', label: 'Nepali',  flag: '🇳🇵', color: C.pink },
  { key: 'other', label: 'Other', flag: '🌐', color: C.violet },
];

const OUTBOUND_STAGES = [
  { order: 1, key: 'ob_welcome',   name: 'Welcome Call',      icon: '👋' },
  { order: 2, key: 'ob_follow_up', name: 'Follow-Up',         icon: '🔄' },
  { order: 3, key: 'ob_answer',    name: 'Answer Questions',  icon: '💬' },
  { order: 4, key: 'ob_workshop',  name: 'Workshop Reminder', icon: '🧘' },
  { order: 5, key: 'ob_collect',   name: 'Collect Info',      icon: '📋' },
  { order: 6, key: 'ob_payment',   name: 'Payment Reminder',  icon: '💰' },
];

const INBOUND_STAGES = [
  { order: 1, key: 'ib_greeting',   name: 'Greeting',    icon: '🙏' },
  { order: 2, key: 'ib_enquiry',    name: 'Enquiry',     icon: '❓' },
  { order: 3, key: 'ib_support',    name: 'Support',     icon: '🛟' },
  { order: 4, key: 'ib_booking',    name: 'Booking',     icon: '📅' },
  { order: 5, key: 'ib_feedback',   name: 'Feedback',    icon: '⭐' },
  { order: 6, key: 'ib_escalation', name: 'Escalation',  icon: '🚨' },
];

const APPROVAL_BADGES: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  draft:    { label: 'Draft',    color: C.gray.main,    bg: C.gray.bg,    Icon: Edit3 },
  pending:  { label: 'Pending',  color: C.amber.main,   bg: C.amber.bg,   Icon: Clock },
  approved: { label: 'Approved', color: C.emerald.main, bg: C.emerald.bg, Icon: CheckCircle },
  rejected: { label: 'Rejected', color: C.red.main,     bg: C.red.bg,     Icon: XCircle },
};

interface Template {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: 'outbound' | 'inbound';
  language: string;
  stageOrder: number;
  promptText: string;
  voiceRecordingUrl: string;
  voiceRecordingName: string;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  approvalNote: string;
  approvedBy?: string;
  approvedAt?: string;
  submittedAt?: string;
  isActive: boolean;
  isDefault: boolean;
  variables: string[];
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CallTemplatesPage() {
  const token = useAuth();
  const router = useRouter();

  // Data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [activeLang, setActiveLang] = useState('hi');
  const [activeCategory, setActiveCategory] = useState<'outbound' | 'inbound'>('outbound');

  // Selection & editing
  const [selectedId, setSelectedId] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');

  // Sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Fetch ──
  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/calls/templates?language=${activeLang}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTemplates(data.data.templates || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, activeLang]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Derived ──
  const outbound = templates.filter(t => t.category === 'outbound').sort((a, b) => a.stageOrder - b.stageOrder);
  const inbound = templates.filter(t => t.category === 'inbound').sort((a, b) => a.stageOrder - b.stageOrder);
  const stages = activeCategory === 'outbound' ? OUTBOUND_STAGES : INBOUND_STAGES;
  const stageTemplates = activeCategory === 'outbound' ? outbound : inbound;
  const selected = templates.find(t => t._id === selectedId) || null;

  // Sidebar items = all stages for both categories
  const sidebarItems = [
    { header: 'Outbound', cat: 'outbound' as const, stages: OUTBOUND_STAGES, templates: outbound },
    { header: 'Inbound', cat: 'inbound' as const, stages: INBOUND_STAGES, templates: inbound },
  ];

  // ── Select template ──
  const selectTemplate = (t: Template) => {
    setSelectedId(t._id);
    setEditPrompt(t.promptText || '');
    setEditMode(false);
    setApprovalNote('');
    setActiveCategory(t.category);
  };

  // ── Save text ──
  const handleSaveText = async () => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected._id, promptText: editPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTemplates();
        setEditMode(false);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Submit for approval ──
  const handleSubmit = async () => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected._id, action: 'submit' }),
      });
      await fetchTemplates();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Approve / Reject ──
  const handleApproval = async (decision: 'approve' | 'reject') => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected._id, action: decision, approvalNote }),
      });
      await fetchTemplates();
      setApprovalNote('');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Voice recording URL save ──
  const handleSaveVoice = async (url: string, name: string) => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected._id, voiceRecordingUrl: url, voiceRecordingName: name }),
      });
      await fetchTemplates();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Loading ──
  if (!token || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="text-gray-500 text-sm">Loading call scripts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ═══ TOP HEADER ═══ */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        {/* Title row */}
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/crm/calls')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.orange.main}, ${C.amber.main})` }}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Call Scripts & Templates</h1>
              <p className="text-[11px] text-gray-400">Sakshi AI — Text, Voice Recording, Approval Workflow</p>
            </div>
          </div>
          <button onClick={fetchTemplates} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* ═══ LANGUAGE TABS ═══ */}
        <div className="px-5 pb-2 flex items-center gap-2">
          {LANGUAGES.map(lang => {
            const isActive = activeLang === lang.key;
            return (
              <button
                key={lang.key}
                onClick={() => { setActiveLang(lang.key); setSelectedId(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
                style={isActive ? { background: `linear-gradient(135deg, ${lang.color.main}, ${lang.color.light})`, boxShadow: `0 4px 14px ${lang.color.main}30` } : {}}
              >
                <span className="text-base">{lang.flag}</span>
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 110px)' }}>

        {/* ═══ SIDEBAR — All template headers ═══ */}
        <aside className={`${sidebarCollapsed ? 'w-14' : 'w-72'} flex-shrink-0 bg-white border-r border-gray-100 transition-all duration-300 flex flex-col`}>
          <div className="px-3 py-3 border-b border-gray-100 flex items-center justify-between">
            {!sidebarCollapsed && <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">All Scripts</span>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarItems.map(group => {
              const isOB = group.cat === 'outbound';
              const groupColor = isOB ? C.emerald : C.blue;
              const GroupIcon = isOB ? PhoneOutgoing : PhoneIncoming;

              return (
                <div key={group.cat}>
                  {/* Group header */}
                  <div
                    className="px-3 py-2.5 flex items-center gap-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50/50"
                    onClick={() => { setActiveCategory(group.cat); setSelectedId(''); }}
                    style={{ borderLeft: activeCategory === group.cat ? `3px solid ${groupColor.main}` : '3px solid transparent' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${groupColor.main}, ${groupColor.light})` }}>
                      <GroupIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-700 uppercase">{group.header}</div>
                        <div className="text-[10px] text-gray-400">{group.templates.length} scripts</div>
                      </div>
                    )}
                  </div>

                  {/* Stage items */}
                  {!sidebarCollapsed && group.stages.map(stage => {
                    const tmpl = group.templates.find(t => t.key === stage.key);
                    const isSelected = tmpl && tmpl._id === selectedId;
                    const status = tmpl?.approvalStatus || 'draft';
                    const badge = APPROVAL_BADGES[status];

                    return (
                      <button
                        key={stage.key}
                        onClick={() => tmpl && selectTemplate(tmpl)}
                        className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition border-b border-gray-50/50 ${
                          isSelected ? '' : 'hover:bg-gray-50/60'
                        }`}
                        style={{
                          backgroundColor: isSelected ? groupColor.bg : undefined,
                          borderLeft: isSelected ? `3px solid ${groupColor.main}` : '3px solid transparent',
                        }}
                      >
                        <span className="text-base flex-shrink-0">{stage.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-700 truncate">{stage.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-px text-[9px] font-semibold rounded" style={{ background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                            {tmpl?.promptText && <FileText className="h-2.5 w-2.5 text-gray-300" />}
                            {tmpl?.voiceRecordingUrl && <Mic className="h-2.5 w-2.5 text-gray-300" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="flex-1 overflow-y-auto">
          {!selected ? (
            /* ── Empty state: show stage grid ── */
            <div className="p-6">
              {/* Category toggle */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setActiveCategory('outbound')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                    activeCategory === 'outbound' ? 'text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                  style={activeCategory === 'outbound' ? { background: `linear-gradient(135deg, ${C.emerald.main}, ${C.emerald.light})` } : {}}
                >
                  <PhoneOutgoing className="h-4 w-4" /> Outbound (6 Stages)
                </button>
                <button
                  onClick={() => setActiveCategory('inbound')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                    activeCategory === 'inbound' ? 'text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                  style={activeCategory === 'inbound' ? { background: `linear-gradient(135deg, ${C.blue.main}, ${C.blue.light})` } : {}}
                >
                  <PhoneIncoming className="h-4 w-4" /> Inbound (6 Stages)
                </button>
              </div>

              {/* ── 6 stage cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stages.map(stage => {
                  const tmpl = stageTemplates.find(t => t.key === stage.key);
                  const status = tmpl?.approvalStatus || 'draft';
                  const badge = APPROVAL_BADGES[status];
                  const BadgeIcon = badge.Icon;
                  const catColor = activeCategory === 'outbound' ? C.emerald : C.blue;

                  return (
                    <div
                      key={stage.key}
                      onClick={() => tmpl && selectTemplate(tmpl)}
                      className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-lg hover:border-gray-200 transition-all group"
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{stage.icon}</span>
                          <div>
                            <div className="text-sm font-bold text-gray-800">{stage.name}</div>
                            <div className="text-[10px] text-gray-400">Stage {stage.order}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: badge.bg }}>
                          <BadgeIcon className="h-3 w-3" style={{ color: badge.color }} />
                          <span className="text-[10px] font-bold" style={{ color: badge.color }}>{badge.label}</span>
                        </div>
                      </div>

                      {/* Status indicators */}
                      <div className="flex items-center gap-3 text-[11px]">
                        <div className={`flex items-center gap-1 ${tmpl?.promptText ? 'text-emerald-500' : 'text-gray-300'}`}>
                          <FileText className="h-3 w-3" />
                          Text {tmpl?.promptText ? '✓' : '—'}
                        </div>
                        <div className={`flex items-center gap-1 ${tmpl?.voiceRecordingUrl ? 'text-emerald-500' : 'text-gray-300'}`}>
                          <Mic className="h-3 w-3" />
                          Voice {tmpl?.voiceRecordingUrl ? '✓' : '—'}
                        </div>
                        <div className={`flex items-center gap-1 ${tmpl?.isActive ? 'text-emerald-500' : 'text-gray-300'}`}>
                          <ShieldCheck className="h-3 w-3" />
                          Approved {tmpl?.isActive ? '✓' : '—'}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${((tmpl?.promptText ? 33 : 0) + (tmpl?.voiceRecordingUrl ? 33 : 0) + (tmpl?.isActive ? 34 : 0))}%`,
                            background: `linear-gradient(90deg, ${catColor.main}, ${catColor.light})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-8 p-4 bg-white rounded-2xl border border-gray-100">
                <div className="text-xs font-bold text-gray-600 mb-3">Workflow: How each script goes live</div>
                <div className="flex items-center gap-3">
                  {[
                    { step: '1', label: 'Write Text', icon: FileText, color: C.indigo },
                    { step: '2', label: 'Add Voice Recording', icon: Mic, color: C.violet },
                    { step: '3', label: 'Admin Approval', icon: Shield, color: C.amber },
                    { step: '4', label: 'Submit to Use', icon: Send, color: C.emerald },
                  ].map((s, i) => (
                    <div key={s.step} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: s.color.main }}>
                        {s.step}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">{s.label}</div>
                      {i < 3 && <ChevronRight className="h-4 w-4 text-gray-300 mx-1" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ═══ TEMPLATE DETAIL VIEW ═══ */
            <div className="max-w-4xl mx-auto p-6 space-y-5">

              {/* ── Header card ── */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">
                      {(activeCategory === 'outbound' ? OUTBOUND_STAGES : INBOUND_STAGES).find(s => s.key === selected.key)?.icon || '📄'}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg text-white" style={{ background: activeCategory === 'outbound' ? C.emerald.main : C.blue.main }}>
                          {activeCategory === 'outbound' ? 'Outbound' : 'Inbound'}
                        </span>
                        <span className="text-xs text-gray-400">Stage {selected.stageOrder}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">{LANGUAGES.find(l => l.key === activeLang)?.label}</span>
                        <span className="text-xs text-gray-300">•</span>
                        {(() => {
                          const b = APPROVAL_BADGES[selected.approvalStatus];
                          const BIcon = b.Icon;
                          return (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: b.bg, color: b.color }}>
                              <BIcon className="h-3 w-3" /> {b.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedId('')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {selected.description && <p className="mt-2 text-xs text-gray-500">{selected.description}</p>}
              </div>

              {/* ── STEP 1: Text Script ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.indigo.main }}>1</div>
                    <span className="text-sm font-bold text-gray-700">Script Text</span>
                    {selected.promptText && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <button
                          onClick={handleSaveText}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow"
                          style={{ background: C.emerald.main }}
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                        </button>
                        <button onClick={() => { setEditMode(false); setEditPrompt(selected.promptText); }} className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 bg-gray-100">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow"
                        style={{ background: C.indigo.main }}
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  {editMode ? (
                    <textarea
                      value={editPrompt}
                      onChange={e => setEditPrompt(e.target.value)}
                      rows={18}
                      className="w-full px-4 py-3 text-sm font-mono leading-relaxed rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-y"
                      placeholder="Write Sakshi's call script here...&#10;&#10;Use {{leadName}}, {{lang}}, {{workshopName}} as variables."
                    />
                  ) : selected.promptText ? (
                    <pre className="text-sm font-mono leading-relaxed text-gray-700 whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto">
                      {selected.promptText}
                    </pre>
                  ) : (
                    <div className="text-center py-10 text-gray-300">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No script text yet. Click Edit to add.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── STEP 2: Voice Recording ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.violet.main }}>2</div>
                    <span className="text-sm font-bold text-gray-700">Voice Recording</span>
                    {selected.voiceRecordingUrl && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                </div>
                <div className="p-5">
                  {selected.voiceRecordingUrl ? (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-violet-50/50 border border-violet-100">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.violet.main }}>
                        <Volume2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{selected.voiceRecordingName || 'Recording'}</div>
                        <a href={selected.voiceRecordingUrl} target="_blank" rel="noreferrer" className="text-xs text-violet-500 hover:underline truncate block">
                          {selected.voiceRecordingUrl}
                        </a>
                      </div>
                      <button
                        onClick={() => handleSaveVoice('', '')}
                        className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Remove recording"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <VoiceUploader onSave={handleSaveVoice} saving={saving} />
                  )}
                </div>
              </div>

              {/* ── STEP 3: Admin Approval ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.amber.main }}>3</div>
                  <span className="text-sm font-bold text-gray-700">Admin Approval</span>
                </div>
                <div className="p-5">
                  {selected.approvalStatus === 'draft' && (
                    <div className="text-center py-6">
                      <Shield className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                      <p className="text-sm text-gray-400 mb-4">Add text and/or voice recording, then submit for approval.</p>
                      <button
                        onClick={handleSubmit}
                        disabled={saving || (!selected.promptText && !selected.voiceRecordingUrl)}
                        className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg disabled:opacity-40 transition"
                        style={{ background: `linear-gradient(135deg, ${C.amber.main}, ${C.orange.main})` }}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Submit for Approval
                      </button>
                    </div>
                  )}

                  {selected.approvalStatus === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                        <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-amber-800">Pending Admin Approval</div>
                          <div className="text-xs text-amber-600 mt-0.5">
                            Submitted {selected.submittedAt ? new Date(selected.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Approval Note (optional)</label>
                        <input
                          value={approvalNote}
                          onChange={e => setApprovalNote(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                          placeholder="Add note for approval/rejection..."
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApproval('approve')}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg"
                          style={{ background: C.emerald.main }}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval('reject')}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg"
                          style={{ background: C.red.main }}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {selected.approvalStatus === 'approved' && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <ShieldCheck className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-emerald-800">Approved & Active</div>
                        <div className="text-xs text-emerald-600 mt-0.5">
                          Approved {selected.approvedAt ? new Date(selected.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          {selected.approvedBy && ` by ${selected.approvedBy}`}
                        </div>
                        {selected.approvalNote && <div className="text-xs text-emerald-500 mt-1 italic">&ldquo;{selected.approvalNote}&rdquo;</div>}
                      </div>
                    </div>
                  )}

                  {selected.approvalStatus === 'rejected' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                        <ShieldAlert className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-red-800">Rejected</div>
                          <div className="text-xs text-red-600 mt-0.5">
                            {selected.approvedBy && `By ${selected.approvedBy}`}
                            {selected.approvedAt && ` on ${new Date(selected.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                          </div>
                          {selected.approvalNote && <div className="text-xs text-red-500 mt-1 italic">&ldquo;{selected.approvalNote}&rdquo;</div>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Edit the script and re-submit for approval.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── STEP 4: Submit to Use (status summary) ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.emerald.main }}>4</div>
                  <span className="text-sm font-bold text-gray-700">Ready to Use</span>
                </div>
                <div className="p-5">
                  {selected.isActive ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.emerald.main }}>
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-emerald-800">This script is LIVE</div>
                        <div className="text-xs text-emerald-600 mt-0.5">
                          Sakshi will use this script for {selected.name} calls in {LANGUAGES.find(l => l.key === activeLang)?.label}.
                          {selected.usageCount > 0 && ` Used ${selected.usageCount} times.`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-200">
                        <AlertCircle className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-600">Not yet active</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Complete the workflow: Add text → Voice recording → Get admin approval
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ═══ Voice URL Uploader Component ═══
function VoiceUploader({ onSave, saving }: { onSave: (url: string, name: string) => void; saving: boolean }) {
  const [voiceUrl, setVoiceUrl] = useState('');
  const [voiceName, setVoiceName] = useState('');

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Add a voice recording URL (Google Drive, Dropbox, or any public link).</p>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Recording Name</label>
        <input
          value={voiceName}
          onChange={e => setVoiceName(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-violet-300 outline-none"
          placeholder="e.g. Welcome Call Hindi v2"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Recording URL</label>
        <input
          value={voiceUrl}
          onChange={e => setVoiceUrl(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-violet-300 outline-none"
          placeholder="https://drive.google.com/file/..."
        />
      </div>
      <button
        onClick={() => { if (voiceUrl) onSave(voiceUrl, voiceName || 'Recording'); }}
        disabled={saving || !voiceUrl}
        className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold shadow disabled:opacity-40"
        style={{ background: C.violet.main }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Save Recording
      </button>
    </div>
  );
}
