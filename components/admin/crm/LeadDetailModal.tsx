'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Phone, Mail, MapPin, Globe, Languages, Send, Edit3, Trash2, UserPlus,
  Tag, RefreshCw, MoreHorizontal, Calendar, Clock, MessageCircle, FileText,
  DollarSign, ArrowLeftRight, CheckCircle, AlertCircle, Bell, Users, Video,
  Building2, ClipboardList, Receipt, ChevronDown, ChevronUp, Save, XCircle,
  Plus, ExternalLink, History, ListTodo, CalendarClock, Quote, FileSpreadsheet,
  MessageSquare, PhoneCall,
} from 'lucide-react';

// ── Types ──
interface Lead {
  _id: string;
  leadNumber?: string;
  name?: string;
  title?: string;
  displayName?: string;
  phoneNumber: string;
  email?: string;
  status?: string;
  labels?: string[];
  source?: string;
  workshopId?: string;
  workshopName?: string;
  assignedToUserId?: string;
  createdByUserId?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  state?: string;
  city?: string;
  language?: string;
  languageCode?: string;
  funnelStage?: string;
  funnelStageChangedAt?: string;
  chatStatus?: string;
  lastMessageAt?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  inSales?: boolean;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminUser {
  userId: string;
  name?: string;
  email?: string;
}

interface LeadDetailModalProps {
  leadId: string;
  token: string;
  onClose: () => void;
  onUpdate?: () => void;
  adminUsers?: AdminUser[];
  labelOptions?: string[];
  workshopOptions?: string[];
  stages?: { key: string; name: string; color: string }[];
  isSuperAdmin?: boolean;
}

// Color mappings
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  lead:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  hot:      { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  prospect: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  customer: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  inactive: { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200' },
};

const STAGE_COLORS: Record<string, string> = {
  new_lead:    '#6366F1',
  contacted:   '#3B82F6',
  interested:  '#06B6D4',
  demo_trial:  '#8B5CF6',
  negotiation: '#F59E0B',
  enrolled:    '#10B981',
  completed:   '#EC4899',
};

const CHAT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:      { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  open:     { bg: 'bg-blue-100',    text: 'text-blue-700' },
  pending:  { bg: 'bg-amber-100',   text: 'text-amber-700' },
  overdue:  { bg: 'bg-red-100',     text: 'text-red-700' },
  closed:   { bg: 'bg-gray-100',    text: 'text-gray-600' },
};

// Default labels
const DEFAULT_LABELS = [
  'New', 'Chatting Replying', 'No Reply', 'Call Pending', 'Call Done',
  'Interested', 'Enrolled', 'Follow Up', 'Hot Lead', 'Cold Lead',
  'Demo Scheduled', 'Payment Pending', 'Completed',
];

// Source options (where lead joined from)
const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'website-form', label: 'Website Form' },
  { value: 'website-signup', label: 'Website Signup' },
  { value: 'form-link', label: 'Form Link' },
  { value: 'form-signup', label: 'Form Signup' },
  { value: 'form-submission', label: 'Form Submission' },
  { value: 'import', label: 'Import' },
  { value: 'csv-import', label: 'CSV Import' },
  { value: 'api', label: 'API' },
  { value: 'manual', label: 'Manual' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'workshop_payment', label: 'Workshop Payment' },
  { value: 'meta_leadgen', label: 'Meta Lead Gen' },
  { value: 'referral', label: 'Referral' },
  { value: 'social', label: 'Social Media' },
  { value: 'event', label: 'Event' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'google', label: 'Google' },
  { value: 'other', label: 'Other' },
];

// ── Main Component ──
export default function LeadDetailModal({
  leadId,
  token,
  onClose,
  onUpdate,
  adminUsers = [],
  labelOptions = DEFAULT_LABELS,
  workshopOptions = [],
  stages = [],
  isSuperAdmin = false,
}: LeadDetailModalProps) {
  const router = useRouter();

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});

  // Tabs
  type TabKey = 'details' | 'followup' | 'history' | 'task' | 'reminder' | 'meeting' | 'quotation' | 'invoice';
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  // Dropdowns
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // New note/task/reminder
  const [newNote, setNewNote] = useState('');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');

  // ── Fetch Lead Detail ──
  const fetchLead = useCallback(async () => {
    if (!token || !leadId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/funnel/lead/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch lead');
      }
      const json = await res.json();
      const data = json.data || {};
      setLead(data.lead || null);
      setTimeline(data.timeline || []);
      setMessages(data.messages || []);
      setStageHistory(data.stageHistory || []);
      setNotes(data.notes || []);
      setSales(data.sales || []);
      setStats(data.stats || null);
      // Initialize edit data
      setEditData(data.lead || {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // ── Save Lead ──
  const saveLead = async () => {
    if (!token || !leadId || !lead) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save lead');
      }
      const json = await res.json();
      setLead(json.data || editData as Lead);
      setIsEditing(false);
      onUpdate?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Move to Funnel Stage ──
  const moveToStage = async (toStage: string) => {
    if (!token || !leadId) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/move', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId, toStage }),
      });
      if (res.ok) {
        await fetchLead();
        onUpdate?.();
      }
    } catch (e) {
      console.error('Move stage error', e);
    }
    setShowStageDropdown(false);
  };

  // ── Delete Lead ──
  const deleteLead = async () => {
    if (!token || !leadId) return;
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onUpdate?.();
        onClose();
      }
    } catch (e) {
      console.error('Delete lead error', e);
    }
  };

  // ── Add Note ──
  const addNote = async () => {
    if (!token || !leadId || !newNote.trim()) return;
    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}/notes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote('');
        await fetchLead();
      }
    } catch (e) {
      console.error('Add note error', e);
    }
  };

  // ── UI Helpers ──
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status?: string) => STATUS_COLORS[status || 'lead'] || STATUS_COLORS.lead;
  const getChatStatusColor = (cs?: string) => CHAT_STATUS_COLORS[cs || 'new'] || CHAT_STATUS_COLORS.new;
  const getStageColor = (stage?: string) => STAGE_COLORS[stage || 'new_lead'] || '#6366F1';
  const getStageName = (stageKey?: string) => stages.find(s => s.key === stageKey)?.name || stageKey || 'New Lead';

  const getAssigneeName = (userId?: string) => {
    if (!userId) return '—';
    const user = adminUsers.find(u => u.userId === userId);
    return user?.name || user?.email || userId;
  };

  // ── Tab Config ──
  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'details',   label: 'Details',   icon: FileText },
    { key: 'followup',  label: 'FollowUp',  icon: CalendarClock, count: notes.length },
    { key: 'history',   label: 'History',   icon: History, count: timeline.length },
    { key: 'task',      label: 'Task',      icon: ListTodo, count: tasks.length },
    { key: 'reminder',  label: 'Reminder',  icon: Bell, count: reminders.length },
    { key: 'meeting',   label: 'Meeting',   icon: Video, count: meetings.length },
    { key: 'quotation', label: 'Quotation', icon: Quote, count: 0 },
    { key: 'invoice',   label: 'Invoice',   icon: FileSpreadsheet, count: sales.length },
  ];

  // ── Loading State ──
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-700 font-medium">Lead not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600">
          <h2 className="text-lg font-bold text-white">Lead Details</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Action Icons Bar ── */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center justify-center gap-1 sm:gap-2 flex-wrap bg-gray-50">
          {/* Edit */}
          <button
            onClick={() => { setIsEditing(!isEditing); setEditData(lead); }}
            className={`p-2 rounded-lg transition ${isEditing ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
            title={isEditing ? 'Cancel Edit' : 'Edit'}
          >
            <Edit3 className="h-5 w-5" />
          </button>

          {/* WhatsApp - Opens Meta Inbox */}
          <button
            onClick={() => {
              onClose();
              router.push(`/admin/crm/meta?phone=${encodeURIComponent(lead.phoneNumber)}`);
            }}
            className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition"
            title="Open in Meta Inbox"
          >
            <Send className="h-5 w-5" />
          </button>

          {/* Call */}
          <a
            href={`tel:${lead.phoneNumber}`}
            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition"
            title="Call"
          >
            <PhoneCall className="h-5 w-5" />
          </a>

          {/* Email */}
          <a
            href={`mailto:${lead.email || ''}`}
            className="p-2 rounded-lg hover:bg-sky-50 text-sky-600 transition"
            title="Email"
          >
            <Mail className="h-5 w-5" />
          </a>

          {/* SMS */}
          <a
            href={`sms:${lead.phoneNumber}`}
            className="p-2 rounded-lg hover:bg-cyan-50 text-cyan-600 transition"
            title="SMS"
          >
            <MessageSquare className="h-5 w-5" />
          </a>

          {/* Receipts */}
          <button
            onClick={() => setActiveTab('invoice')}
            className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
            title="Receipts"
          >
            <Receipt className="h-5 w-5" />
          </button>

          {/* Assign User */}
          <div className="relative">
            <button
              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
              className="p-2 rounded-lg hover:bg-violet-50 text-violet-600 transition"
              title="Assign To"
            >
              <UserPlus className="h-5 w-5" />
            </button>
            {showAssignDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setEditData({ ...editData, assignedToUserId: '' }); setShowAssignDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                >
                  Unassign
                </button>
                {adminUsers.map(u => (
                  <button
                    key={u.userId}
                    onClick={() => { setEditData({ ...editData, assignedToUserId: u.userId }); setShowAssignDropdown(false); setIsEditing(true); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 text-gray-700"
                  >
                    {u.name || u.email || u.userId}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={deleteLead}
            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition"
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          {/* Labels */}
          <div className="relative">
            <button
              onClick={() => setShowLabelsDropdown(!showLabelsDropdown)}
              className="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition"
              title="Labels"
            >
              <Tag className="h-5 w-5" />
            </button>
            {showLabelsDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 max-h-64 overflow-y-auto">
                <div className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase">Select Labels</div>
                {labelOptions.map(label => {
                  const selected = (editData.labels || lead.labels || []).includes(label);
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        const current = editData.labels || lead.labels || [];
                        const next = selected ? current.filter(l => l !== label) : [...current, label];
                        setEditData({ ...editData, labels: next });
                        setIsEditing(true);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${selected ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span className={`w-3 h-3 rounded border ${selected ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                        {selected && <CheckCircle className="h-3 w-3 text-white" />}
                      </span>
                      {label}
                    </button>
                  );
                })}
                <div className="px-3 pt-2 border-t border-gray-100 mt-2">
                  <button onClick={() => setShowLabelsDropdown(false)} className="w-full px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Funnel Stage */}
          <div className="relative">
            <button
              onClick={() => setShowStageDropdown(!showStageDropdown)}
              className="p-2 rounded-lg hover:bg-cyan-50 text-cyan-600 transition"
              title="Change Funnel Stage"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            {showStageDropdown && stages.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 max-h-64 overflow-y-auto">
                {stages.map(s => (
                  <button
                    key={s.key}
                    onClick={() => moveToStage(s.key)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${lead.funnelStage === s.key ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separator & Update */}
          <div className="h-6 w-px bg-gray-200 mx-1" />
          {isEditing ? (
            <>
              <button
                onClick={saveLead}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Update'}
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditData(lead); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
              >
                <XCircle className="h-4 w-4" /> Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => { setIsEditing(true); setEditData(lead); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              <Edit3 className="h-4 w-4" />
              Edit & Update
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 px-4 sm:px-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {(tab.count ?? 0) > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${active ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lead Information */}
              <div className="rounded-xl overflow-hidden border border-indigo-100">
                <div className="px-4 py-3 text-white font-semibold text-center" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                  Lead Information
                </div>
                <div className="p-4 space-y-4 bg-white">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name :</label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <select
                          value={editData.title || ''}
                          onChange={e => setEditData({ ...editData, title: e.target.value })}
                          className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        >
                          <option value="">—</option>
                          <option value="Mr">Mr</option>
                          <option value="Miss">Miss</option>
                        </select>
                        <input
                          type="text"
                          value={editData.name || ''}
                          onChange={e => setEditData({ ...editData, name: e.target.value })}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800">{lead.title ? `${lead.title}. ` : ''}{lead.name || lead.displayName || '—'}</p>
                    )}
                  </div>

                  {/* Company Name (metadata) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Company Name :</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.metadata?.companyName || ''}
                        onChange={e => setEditData({ ...editData, metadata: { ...(editData.metadata || {}), companyName: e.target.value } })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">{lead.metadata?.companyName || '—'}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone :</label>
                    <p className="text-sm text-gray-800">{lead.phoneNumber}</p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email Address :</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editData.email || ''}
                        onChange={e => setEditData({ ...editData, email: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">{lead.email || '—'}</p>
                    )}
                  </div>

                  {/* Address (city, state, country) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Address :</label>
                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editData.city || ''}
                          onChange={e => setEditData({ ...editData, city: e.target.value })}
                          placeholder="City"
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                        <input
                          type="text"
                          value={editData.state || ''}
                          onChange={e => setEditData({ ...editData, state: e.target.value })}
                          placeholder="State"
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                        <input
                          type="text"
                          value={editData.country || ''}
                          onChange={e => setEditData({ ...editData, country: e.target.value })}
                          placeholder="Country"
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800">
                        {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '—'}
                      </p>
                    )}
                  </div>

                  {/* Comment (metadata) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Comment :</label>
                    {isEditing ? (
                      <textarea
                        value={editData.metadata?.comment || ''}
                        onChange={e => setEditData({ ...editData, metadata: { ...(editData.metadata || {}), comment: e.target.value } })}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">{lead.metadata?.comment || '—'}</p>
                    )}
                  </div>

                  {/* Reference */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Reference :</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.metadata?.reference || ''}
                        onChange={e => setEditData({ ...editData, metadata: { ...(editData.metadata || {}), reference: e.target.value } })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">{lead.metadata?.reference || '—'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* General Information */}
              <div className="rounded-xl overflow-hidden border border-emerald-100">
                <div className="px-4 py-3 text-white font-semibold text-center" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}>
                  General Information
                </div>
                <div className="p-4 space-y-4 bg-white">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date :</label>
                    <p className="text-sm text-gray-800">{formatDateTime(lead.createdAt)}</p>
                  </div>

                  {/* Follow Up Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Follow Up Date :</label>
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        value={editData.metadata?.followUpDate || ''}
                        onChange={e => setEditData({ ...editData, metadata: { ...(editData.metadata || {}), followUpDate: e.target.value } })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">{lead.metadata?.followUpDate ? formatDateTime(lead.metadata.followUpDate) : '—'}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status :</label>
                    {isEditing ? (
                      <select
                        value={editData.status || 'lead'}
                        onChange={e => setEditData({ ...editData, status: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      >
                        <option value="lead">Lead</option>
                        <option value="hot">🔥 Hot</option>
                        <option value="prospect">Prospect</option>
                        <option value="customer">Customer</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status).bg} ${getStatusColor(lead.status).text}`}>
                        {lead.status === 'hot' ? '🔥 ' : ''}{lead.status || 'lead'}
                      </span>
                    )}
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Source :</label>
                    {isEditing ? (
                      <select
                        value={editData.source || lead.source || 'manual'}
                        onChange={e => setEditData({ ...editData, source: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      >
                        {SOURCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {SOURCE_OPTIONS.find(s => s.value === lead.source)?.label || lead.source || '—'}
                      </span>
                    )}
                  </div>

                  {/* Labels */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Labels :</label>
                    <div className="flex flex-wrap gap-1">
                      {(isEditing ? editData.labels : lead.labels)?.map((label, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          {label}
                          {isEditing && (
                            <button
                              onClick={() => setEditData({ ...editData, labels: (editData.labels || []).filter(l => l !== label) })}
                              className="ml-1 text-indigo-400 hover:text-indigo-600"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      )) || <span className="text-sm text-gray-400">—</span>}
                    </div>
                  </div>

                  {/* Workshop */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Workshop :</label>
                    {isEditing ? (
                      <select
                        value={editData.workshopName || ''}
                        onChange={e => setEditData({ ...editData, workshopName: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      >
                        <option value="">Select workshop...</option>
                        {workshopOptions.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-800">{lead.workshopName || '—'}</p>
                    )}
                  </div>

                  {/* Created By */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Created By :</label>
                    <p className="text-sm text-gray-800">{getAssigneeName(lead.createdByUserId)}</p>
                  </div>

                  {/* Assign To */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Assign To :</label>
                    {isEditing && isSuperAdmin ? (
                      <select
                        value={editData.assignedToUserId || ''}
                        onChange={e => setEditData({ ...editData, assignedToUserId: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      >
                        <option value="">Unassigned</option>
                        {adminUsers.map(u => (
                          <option key={u.userId} value={u.userId}>{u.name || u.email || u.userId}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-800">{getAssigneeName(lead.assignedToUserId)}</p>
                    )}
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Language :</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.language || ''}
                        onChange={e => setEditData({ ...editData, language: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">{lead.language || '—'}</p>
                    )}
                  </div>

                  {/* Region */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Region :</label>
                    <p className="text-sm text-gray-800">
                      {lead.region ? (
                        <span className={`inline-flex items-center gap-1 ${lead.region === 'South India' ? 'text-cyan-600' : 'text-amber-600'}`}>
                          {lead.region === 'South India' ? '🌴' : '🏔️'} {lead.region}
                        </span>
                      ) : '—'}
                    </p>
                  </div>

                  {/* Funnel Stage */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Funnel Stage :</label>
                    <span
                      className="inline-block px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getStageColor(lead.funnelStage) }}
                    >
                      {getStageName(lead.funnelStage)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FollowUp Tab - Notes */}
          {activeTab === 'followup' && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Add new note */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a follow-up note..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
                <button
                  onClick={addNote}
                  disabled={!newNote.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Notes list */}
              <div className="space-y-3">
                {notes.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No follow-up notes yet</p>}
                {notes.map((note: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                    <p className="text-sm text-gray-700">{note.note}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                      <span>{note.createdByUserId || 'Unknown'}</span>
                      <span>{formatDateTime(note.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Tab - Timeline */}
          {activeTab === 'history' && (
            <div className="p-4 sm:p-6">
              <div className="space-y-3">
                {timeline.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No history yet</p>}
                {timeline.map((item: any, idx: number) => {
                  const typeColors: Record<string, string> = {
                    stage_change: '#8B5CF6',
                    message: '#3B82F6',
                    note: '#F59E0B',
                    sale: '#10B981',
                  };
                  const typeIcons: Record<string, string> = {
                    stage_change: '🔄',
                    message: '💬',
                    note: '📝',
                    sale: '💰',
                  };
                  return (
                    <div key={idx} className="flex gap-3 items-start">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${typeColors[item.type]}15`, color: typeColors[item.type] }}
                      >
                        {typeIcons[item.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800 capitalize">{item.type.replace('_', ' ')}</span>
                          <span className="text-xs text-gray-400">{formatDateTime(item.date)}</span>
                        </div>
                        {item.type === 'stage_change' && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.fromStage} → <span className="font-medium text-indigo-600">{item.toStage}</span> by {item.by}</p>
                        )}
                        {item.type === 'message' && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className={item.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}>{item.direction === 'inbound' ? '← In' : '→ Out'}</span>
                            {' '}{item.content || '(media)'}
                          </p>
                        )}
                        {item.type === 'note' && <p className="text-xs text-gray-500 mt-0.5">{item.content} — by {item.by}</p>}
                        {item.type === 'sale' && (
                          <p className="text-xs text-gray-500 mt-0.5">₹{item.amount?.toLocaleString('en-IN')} — {item.paymentMode}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Task Tab */}
          {activeTab === 'task' && (
            <div className="p-4 sm:p-6">
              <div className="text-center py-12 text-gray-400">
                <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No tasks yet</p>
                <button className="mt-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition">
                  <Plus className="h-4 w-4 inline mr-1" /> Add Task
                </button>
              </div>
            </div>
          )}

          {/* Reminder Tab */}
          {activeTab === 'reminder' && (
            <div className="p-4 sm:p-6">
              <div className="text-center py-12 text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No reminders set</p>
                <button className="mt-3 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-medium hover:bg-amber-100 transition">
                  <Plus className="h-4 w-4 inline mr-1" /> Add Reminder
                </button>
              </div>
            </div>
          )}

          {/* Meeting Tab */}
          {activeTab === 'meeting' && (
            <div className="p-4 sm:p-6">
              <div className="text-center py-12 text-gray-400">
                <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No meetings scheduled</p>
                <button className="mt-3 px-4 py-2 bg-violet-50 text-violet-600 rounded-xl text-sm font-medium hover:bg-violet-100 transition">
                  <Plus className="h-4 w-4 inline mr-1" /> Schedule Meeting
                </button>
              </div>
            </div>
          )}

          {/* Quotation Tab */}
          {activeTab === 'quotation' && (
            <div className="p-4 sm:p-6">
              <div className="text-center py-12 text-gray-400">
                <Quote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No quotations created</p>
                <button className="mt-3 px-4 py-2 bg-cyan-50 text-cyan-600 rounded-xl text-sm font-medium hover:bg-cyan-100 transition">
                  <Plus className="h-4 w-4 inline mr-1" /> Create Quotation
                </button>
              </div>
            </div>
          )}

          {/* Invoice Tab - Sales */}
          {activeTab === 'invoice' && (
            <div className="p-4 sm:p-6">
              {sales.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices/sales recorded</p>
                  <button className="mt-3 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium hover:bg-emerald-100 transition">
                    <Plus className="h-4 w-4 inline mr-1" /> Create Invoice
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sales.map((s: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-emerald-700">₹{s.saleAmount?.toLocaleString('en-IN')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {s.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                        {s.workshopName && <p>Workshop: {s.workshopName}</p>}
                        {s.paymentMode && <p>Payment: {s.paymentMode}</p>}
                        <p>{formatDate(s.saleDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
          <span>Lead #{lead.leadNumber || '—'}</span>
          <span>Last updated: {formatDateTime(lead.updatedAt)}</span>
          <button onClick={onClose} className="px-4 py-1.5 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
