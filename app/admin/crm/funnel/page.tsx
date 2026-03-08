'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts';
import {
  Sparkles, Phone, Heart, Play, Handshake, CheckCircle, Trophy,
  Users, MessageCircle, TrendingUp, DollarSign, Globe, Languages,
  MapPin, Filter, ChevronDown, ChevronRight, X, Send, Mail, FileText,
  Clock, ArrowRight, MoreHorizontal, Search, RefreshCw, Calendar,
  Activity, Eye, Edit3, ArrowLeftRight, ChevronUp, Zap,
  PauseCircle, Repeat, Flower2, Megaphone, Plus,
} from 'lucide-react';
import LeadDetailModal from '@/components/admin/crm/LeadDetailModal';
import { AddToBroadcastModal } from '@/components/admin/crm';

// ── 4K-quality vibrant color palette ──
const COLORS = {
  // Stage colors (gradient pairs)
  indigo:     { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)' },
  blue:       { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' },
  cyan:       { main: '#06B6D4', light: '#22D3EE', bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)' },
  violet:     { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)' },
  amber:      { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  emerald:    { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  pink:       { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  // Chart colors
  chart: ['#6366F1', '#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#EF4444', '#14B8A6', '#F97316'],
  // Region colors
  northIndia: { main: '#F59E0B', light: '#FDE68A', bg: 'rgba(245,158,11,0.08)' },
  southIndia: { main: '#06B6D4', light: '#A5F3FC', bg: 'rgba(6,182,212,0.08)' },
  // Status
  online:     '#10B981',
  offline:    '#6B7280',
  // Bg
  cardBg:     '#FFFFFF',
  pageBg:     '#F8FAFC',
  darkCard:   '#1E293B',
  darkBg:     '#0F172A',
};

const gray    = { main: '#6B7280', light: '#9CA3AF', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' };
const orange  = { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)' };
const teal    = { main: '#14B8A6', light: '#2DD4BF', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.2)' };
const purple  = { main: '#A855F7', light: '#C084FC', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.2)' };

const STAGE_COLORS = [COLORS.indigo, COLORS.blue, COLORS.cyan, COLORS.violet, COLORS.amber, COLORS.emerald, COLORS.pink, gray, orange, teal, purple];
const STAGE_ICONS: Record<string, any> = {
  sparkles: Sparkles, phone: Phone, heart: Heart, play: Play,
  handshake: Handshake, 'check-circle': CheckCircle, trophy: Trophy,
  'pause-circle': PauseCircle, repeat: Repeat, lotus: Flower2, megaphone: Megaphone,
};

interface FunnelStage {
  key: string;
  name: string;
  color: string;
  colorGradient: string;
  order: number;
  icon: string;
  isDefault: boolean;
  description: string;
}

interface Lead {
  _id: string;
  leadNumber?: string;
  name: string;
  phoneNumber: string;
  email?: string;
  status: string;
  labels: string[];
  source: string;
  workshopName?: string;
  funnelStage: string;
  assignedToUserId?: string;
  lastMessageAt?: string;
  chatStatus?: string;
  createdAt: string;
  updatedAt: string;
  country?: string;
  countryCode?: string;
  region?: string;
  state?: string;
  language?: string;
  languageCode?: string;
  title?: string;
  displayName?: string;
}

interface AdminActivity {
  userId: string;
  userName: string;
  isOnline: boolean;
  loginAt?: string;
  logoutAt?: string;
  lastActiveAt?: string;
  totalLeadsAssigned: number;
  todayStats: {
    leadsCreated: number;
    messagesSent: number;
    stageChanges: number;
    salesRecorded: number;
  };
}

// ── Lead Detail Popup ──
function LeadDetailPopup({ leadId, token, onClose }: { leadId: string; token: string; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'stages' | 'sales'>('timeline');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/admin/crm/funnel/lead/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (e) {
        console.error('Failed to fetch lead detail', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [leadId, token]);

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

  if (!data) return null;

  const { lead, timeline, stats } = data;
  const tabs = [
    { key: 'timeline', label: 'Timeline', icon: Clock },
    { key: 'messages', label: 'Messages', icon: MessageCircle },
    { key: 'stages', label: 'Stage History', icon: ArrowLeftRight },
    { key: 'sales', label: 'Sales', icon: DollarSign },
  ];

  const timelineTypeColors: Record<string, string> = {
    stage_change: '#8B5CF6',
    message: '#3B82F6',
    note: '#F59E0B',
    sale: '#10B981',
  };

  const timelineTypeIcons: Record<string, string> = {
    stage_change: '🔄',
    message: '💬',
    note: '📝',
    sale: '💰',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ border: '1px solid rgba(99,102,241,0.15)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-xl font-bold">{lead.title ? `${lead.title}. ` : ''}{lead.name || lead.displayName || 'Unknown'}</h2>
              <div className="flex items-center gap-4 mt-1 text-white/80 text-sm">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.phoneNumber}</span>
                {lead.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>}
              </div>
              <div className="flex items-center gap-3 mt-2 text-white/70 text-xs">
                <span>#{lead.leadNumber || '—'}</span>
                <span>Joined: {new Date(stats.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>{stats.daysSinceJoined} days ago</span>
                {lead.country && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{lead.country}</span>}
                {lead.region && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.region}</span>}
                {lead.language && <span className="flex items-center gap-1"><Languages className="h-3 w-3" />{lead.language}</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Messages', value: stats.totalMessages, color: '#60A5FA' },
              { label: 'Stage Changes', value: stats.totalStageChanges, color: '#A78BFA' },
              { label: 'Notes', value: stats.totalNotes, color: '#FBBF24' },
              { label: 'Sales', value: stats.totalSales, color: '#34D399' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-white/60 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {timeline.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No activity yet</p>}
              {timeline.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${timelineTypeColors[item.type]}15`, color: timelineTypeColors[item.type] }}
                  >
                    {timelineTypeIcons[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 capitalize">{item.type.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">{new Date(item.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {item.type === 'stage_change' && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.fromStage} → <span className="font-medium text-indigo-600">{item.toStage}</span> by {item.by}{item.note ? ` — ${item.note}` : ''}</p>
                    )}
                    {item.type === 'message' && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        <span className={item.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}>{item.direction === 'inbound' ? '← In' : '→ Out'}</span>
                        {' '}{item.content || '(media/template)'}
                      </p>
                    )}
                    {item.type === 'note' && <p className="text-xs text-gray-500 mt-0.5">{item.content} — by {item.by}</p>}
                    {item.type === 'sale' && (
                      <p className="text-xs text-gray-500 mt-0.5">₹{item.amount?.toLocaleString('en-IN')} — {item.paymentMode} — {item.workshopName}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-2">
              {data.messages.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No messages</p>}
              {data.messages.map((msg: any, idx: number) => (
                <div key={idx} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.direction === 'inbound'
                        ? 'bg-gray-100 text-gray-800 rounded-bl-md'
                        : 'text-white rounded-br-md'
                    }`}
                    style={msg.direction !== 'inbound' ? { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' } : {}}
                  >
                    <p>{msg.messageContent || `[${msg.messageType}]`}</p>
                    <div className={`text-xs mt-1 ${msg.direction === 'inbound' ? 'text-gray-400' : 'text-white/60'}`}>
                      {new Date(msg.sentAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      {msg.status && ` · ${msg.status}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stages' && (
            <div className="space-y-3">
              {data.stageHistory.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No stage changes</p>}
              {data.stageHistory.map((h: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-violet-50/50 border border-violet-100">
                  <ArrowLeftRight className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">{h.fromStage || '—'}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">{h.toStage}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      by {h.changedByName || h.changedByUserId} · {new Date(h.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {h.note && ` · ${h.note}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-3">
              {data.sales.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No sales recorded</p>}
              {data.sales.map((s: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-emerald-700">₹{s.saleAmount?.toLocaleString('en-IN')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                    {s.workshopName && <p>Workshop: {s.workshopName}</p>}
                    {s.paymentMode && <p>Payment: {s.paymentMode}</p>}
                    <p>{new Date(s.saleDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-wrap">
          <button
            onClick={() => {
              const phone = (lead.phoneNumber || '').replace(/\D/g, '');
              if (phone) router.push(`/admin/crm/meta?phone=${phone}`);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
          >
            <Send className="h-3.5 w-3.5" /> WhatsApp
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
            <Mail className="h-3.5 w-3.5" /> Email
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition">
            <FileText className="h-3.5 w-3.5" /> Tally Receipt
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 transition">
            <Phone className="h-3.5 w-3.5" /> Call
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Activity Card ──
function AdminActivityCard({ admins }: { admins: AdminActivity[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            <Users className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-800">Admin Team Activity</h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
            {admins.filter(a => a.isOnline).length} online
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {admins.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No admin activity data</p>}
          {admins.map((admin) => (
            <div
              key={admin.userId}
              className="flex items-center gap-4 p-3 rounded-xl border transition hover:shadow-sm"
              style={{
                borderColor: admin.isOnline ? COLORS.emerald.border : 'rgba(229,231,235,1)',
                backgroundColor: admin.isOnline ? COLORS.emerald.bg : '#FAFAFA',
              }}
            >
              {/* Avatar + status */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                  style={{ background: admin.isOnline ? 'linear-gradient(135deg, #10B981, #34D399)' : 'linear-gradient(135deg, #6B7280, #9CA3AF)' }}
                >
                  {admin.userName?.charAt(0).toUpperCase() || admin.userId.charAt(0).toUpperCase()}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    admin.isOnline ? 'bg-green-400' : 'bg-gray-400'
                  }`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-800 truncate">{admin.userName || admin.userId}</span>
                  <span className={`text-xs ${admin.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                    {admin.isOnline ? 'Online' : admin.lastActiveAt ? `Last seen ${new Date(admin.lastActiveAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}` : 'Offline'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {admin.loginAt && `In: ${new Date(admin.loginAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                  {admin.logoutAt && ` · Out: ${new Date(admin.logoutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                  {!admin.loginAt && !admin.logoutAt && `${admin.totalLeadsAssigned} leads assigned`}
                </div>
              </div>

              {/* Today's stats */}
              <div className="flex gap-3">
                {[
                  { label: 'Msgs', value: admin.todayStats.messagesSent, color: '#3B82F6' },
                  { label: 'Moves', value: admin.todayStats.stageChanges, color: '#8B5CF6' },
                  { label: 'Sales', value: admin.todayStats.salesRecorded, color: '#10B981' },
                  { label: 'Leads', value: admin.todayStats.leadsCreated, color: '#F59E0B' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Funnel Dashboard ──
export default function FunnelDashboardPage() {
  const router = useRouter();
  const token = useAuth();

  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [admins, setAdmins] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeStage, setActiveStage] = useState<string>('');
  const [period, setPeriod] = useState<string>('daily');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Popup
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Bulk selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  // Edit stages
  const [editingStages, setEditingStages] = useState(false);
  const [editStages, setEditStages] = useState<FunnelStage[]>([]);
  const [editFunnelName, setEditFunnelName] = useState('Default Funnel');

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const u = JSON.parse(localStorage.getItem('admin_user') || '{}');
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setIsSuperAdmin((u?.userId === 'admin' || u?.userId === 'admincrm') || perms.includes('all'));
    } catch { setIsSuperAdmin(false); }
  }, []);

  // Fetch funnel config
  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/config', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        const sorted = (json.data.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order);
        setStages(sorted);
        if (json.data.name) setEditFunnelName(json.data.name);
      }
    } catch (e) { console.error('Config fetch error', e); }
  }, [token]);

  // Fetch leads with stages
  const fetchLeads = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (activeStage) params.set('stage', activeStage);
      if (searchQuery) params.set('search', searchQuery);
      if (filterCountry) params.set('country', filterCountry);
      if (filterRegion) params.set('region', filterRegion);
      if (filterLanguage) params.set('language', filterLanguage);
      if (filterAdmin) params.set('assignedTo', filterAdmin);
      params.set('limit', '50');

      const res = await fetch(`/api/admin/crm/funnel/leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStageCounts(json.data.stageCounts || {});
        setLeads(json.data.leads || []);
      }
    } catch (e) { console.error('Leads fetch error', e); }
  }, [token, activeStage, searchQuery, filterCountry, filterRegion, filterLanguage, filterAdmin]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ period });
      if (filterAdmin) params.set('assignedTo', filterAdmin);
      const res = await fetch(`/api/admin/crm/funnel/analytics?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data);
      }
    } catch (e) { console.error('Analytics fetch error', e); }
  }, [token, period, filterAdmin]);

  // Fetch admin activity
  const fetchAdmins = useCallback(async () => {
    if (!token || !isSuperAdmin) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/admin-activity', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setAdmins(json.data.admins || []);
      }
    } catch (e) { console.error('Admin activity fetch error', e); }
  }, [token, isSuperAdmin]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchLeads(), fetchAnalytics(), fetchAdmins()]);
      setLoading(false);
    };
    if (token) load();
  }, [token, fetchConfig, fetchLeads, fetchAnalytics, fetchAdmins]);

  // Move lead to stage
  const moveLead = async (leadId: string, toStage: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/move', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, toStage }),
      });
      if (res.ok) {
        fetchLeads();
        fetchAnalytics();
      }
    } catch (e) { console.error('Move lead error', e); }
  };

  // Save stage config
  const saveStageConfig = async () => {
    if (!token) return;
    // Validate: each stage needs a key and name
    for (const s of editStages) {
      if (!s.name.trim()) { alert('Each stage must have a name'); return; }
      if (!s.key.trim()) { alert('Each stage must have a key'); return; }
    }
    try {
      const res = await fetch('/api/admin/crm/funnel/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: editStages, name: editFunnelName }),
      });
      if (res.ok) {
        setEditingStages(false);
        fetchConfig();
        fetchLeads();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to save funnel config');
      }
    } catch (e) { console.error('Save config error', e); }
  };

  // Add a new stage to the edit list
  const addNewStage = () => {
    const newKey = `stage_${Date.now()}`;
    const colorIdx = editStages.length % STAGE_COLORS.length;
    const color = STAGE_COLORS[colorIdx];
    setEditStages(prev => [
      ...prev,
      {
        key: newKey,
        name: '',
        color: color.main,
        colorGradient: color.light,
        order: prev.length,
        icon: 'sparkles',
        isDefault: false,
        description: '',
      },
    ]);
  };

  // Remove a stage from the edit list
  const removeEditStage = (idx: number) => {
    if (editStages.length <= 2) { alert('Minimum 2 stages required'); return; }
    setEditStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const totalLeads = Object.values(stageCounts).reduce((s, c) => s + c, 0);

  // Stage color helper
  const getStageColor = (idx: number) => STAGE_COLORS[idx % STAGE_COLORS.length];
  const getStageIcon = (icon: string) => STAGE_ICONS[icon] || Sparkles;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading Funnel Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: COLORS.pageBg }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              Sales Funnel
            </h1>
            <p className="text-sm text-gray-500 mt-1">Track leads through your 7-step funnel pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Actions → direct link to manage page */}
            <button
              onClick={() => router.push('/admin/crm/funnel/manage')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              <Zap className="h-4 w-4" /> Actions
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition shadow-sm">
              <Filter className="h-4 w-4" /> Filters {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => { setEditStages(stages.map(s => ({ ...s }))); setEditFunnelName(editFunnelName || 'Default Funnel'); setEditingStages(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition shadow-sm"
              >
                <Edit3 className="h-4 w-4" /> Edit Stages
              </button>
            )}
            <button onClick={() => { fetchLeads(); fetchAnalytics(); fetchAdmins(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition shadow-sm">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {/* ── Filters Panel ── */}
        {showFilters && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Name, phone..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Country</label>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none">
                <option value="">All Countries</option>
                {(analytics?.countryBreakdown || []).map((c: any) => (
                  <option key={c.country} value={c.country}>{c.country} ({c.count})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Region (India)</label>
              <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none">
                <option value="">All Regions</option>
                <option value="North India">🏔️ North India</option>
                <option value="South India">🌴 South India</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Language</label>
              <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none">
                <option value="">All Languages</option>
                {(analytics?.languageBreakdown || []).map((l: any) => (
                  <option key={l.languageCode} value={l.languageCode}>{l.language} ({l.count})</option>
                ))}
              </select>
            </div>
            {isSuperAdmin && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Admin</label>
                <select value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none">
                  <option value="">All Admins</option>
                  {admins.map(a => (
                    <option key={a.userId} value={a.userId}>{a.userName || a.userId}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── Summary Stats ── */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Total Leads', value: analytics.summary.totalLeads, icon: Users, color: COLORS.indigo },
              { label: 'Today Leads', value: analytics.summary.todayLeads, icon: Sparkles, color: COLORS.blue },
              { label: 'Messages', value: analytics.summary.totalMessages, icon: MessageCircle, color: COLORS.cyan },
              { label: 'Today Msgs', value: analytics.summary.todayMessages, icon: Send, color: COLORS.violet },
              { label: 'Total Sales', value: analytics.summary.totalSales, icon: DollarSign, color: COLORS.emerald },
              { label: 'Today Sales', value: analytics.summary.todaySales, icon: TrendingUp, color: COLORS.amber },
              { label: 'Revenue', value: `₹${(analytics.summary.totalRevenue / 1000).toFixed(0)}K`, icon: DollarSign, color: COLORS.pink },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-4 shadow-sm border transition hover:shadow-md"
                  style={{ borderColor: stat.color.border }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${stat.color.main}, ${stat.color.light})` }}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900">{typeof stat.value === 'number' ? stat.value.toLocaleString('en-IN') : stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Funnel Pipeline (7 stages) ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Funnel Pipeline</h2>
            <div className="text-sm text-gray-500">{totalLeads} total leads</div>
          </div>
          <div className="grid grid-cols-7 divide-x divide-gray-100">
            {stages.map((stage, idx) => {
              const color = getStageColor(idx);
              const Icon = getStageIcon(stage.icon);
              const count = stageCounts[stage.key] || 0;
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              const isActive = activeStage === stage.key;

              return (
                <button
                  key={stage.key}
                  onClick={() => setActiveStage(isActive ? '' : stage.key)}
                  className={`p-4 text-center transition-all hover:bg-gray-50/50 ${isActive ? 'ring-2 ring-inset' : ''}`}
                  style={isActive ? { backgroundColor: color.bg, boxShadow: `inset 0 0 0 2px ${color.main}` } : {}}
                >
                  <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2"
                    style={{ background: `linear-gradient(135deg, ${color.main}, ${color.light})` }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold" style={{ color: color.main }}>{count}</div>
                  <div className="text-xs font-medium text-gray-600 mt-0.5 truncate">{stage.name}</div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color.main}, ${color.light})` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{pct}%</div>
                </button>
              );
            })}
          </div>

          {/* Funnel shape visualization */}
          <div className="px-5 py-4 border-t border-gray-100">
            <div className="flex flex-col items-center">
              {stages.map((stage, idx) => {
                const color = getStageColor(idx);
                const count = stageCounts[stage.key] || 0;
                const pct = totalLeads > 0 ? Math.max(20, (count / totalLeads) * 100) : 20;
                return (
                  <div
                    key={stage.key}
                    className="flex items-center justify-center text-white text-xs font-medium py-1.5 transition-all"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color.main}, ${color.light})`,
                      borderRadius: idx === 0 ? '8px 8px 0 0' : idx === stages.length - 1 ? '0 0 8px 8px' : '0',
                      minWidth: '120px',
                    }}
                  >
                    {stage.name}: {count}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Admin Activity (Super admin only) ── */}
        {isSuperAdmin && admins.length > 0 && <AdminActivityCard admins={admins} />}

        {/* ── Leads in selected stage ── */}
        {activeStage && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                {stages.find(s => s.key === activeStage)?.name || activeStage} — {leads.length} leads
              </h3>
              <button onClick={() => setActiveStage('')} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {leads.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No leads in this stage</p>}
              {leads.map((lead) => (
                <div key={lead._id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition group">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.has(lead._id)}
                    onChange={() => {
                      setSelectedLeadIds(prev => {
                        const next = new Set(prev);
                        if (next.has(lead._id)) next.delete(lead._id); else next.add(lead._id);
                        return next;
                      });
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                  />
                  {/* Lead info */}
                  <button onClick={() => setSelectedLeadId(lead._id)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800 truncate">{lead.title ? `${lead.title}. ` : ''}{lead.name || 'Unknown'}</span>
                      {lead.leadNumber && <span className="text-xs text-gray-400">#{lead.leadNumber}</span>}
                      {lead.country && lead.country !== 'India' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{lead.country}</span>
                      )}
                      {lead.region && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${lead.region === 'South India' ? 'bg-cyan-50 text-cyan-600' : 'bg-amber-50 text-amber-600'}`}>
                          {lead.region === 'South India' ? '🌴' : '🏔️'} {lead.region}
                        </span>
                      )}
                      {lead.language && <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">{lead.language}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>{lead.phoneNumber}</span>
                      {lead.email && <span>{lead.email}</span>}
                      {lead.lastMessageAt && <span>Last msg: {new Date(lead.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                  </button>

                  {/* Labels */}
                  <div className="hidden sm:flex gap-1 flex-shrink-0">
                    {lead.labels?.slice(0, 2).map((l, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{l}</span>
                    ))}
                  </div>

                  {/* Stage move buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    {stages.filter(s => s.key !== lead.funnelStage).slice(0, 3).map((s, idx) => {
                      const c = getStageColor(stages.findIndex(st => st.key === s.key));
                      return (
                        <button
                          key={s.key}
                          onClick={() => moveLead(lead._id, s.key)}
                          title={`Move to ${s.name}`}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-white transition hover:opacity-90"
                          style={{ background: c.main }}
                        >
                          {s.name.substring(0, 5)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/admin/crm/meta?phone=${encodeURIComponent(lead.phoneNumber?.replace(/\D/g, '') || '')}`)}
                      title="WhatsApp (Meta)"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition hover:opacity-90"
                      style={{ background: '#25D366' }}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedLeadId(lead._id)}
                      title="View details"
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Charts Section ── */}
        {analytics && (
          <>
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Period:</span>
              {['daily', 'weekly', 'monthly', 'yearly'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    period === p
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
              {period === 'yearly' && analytics.financialYear && (
                <span className="text-xs text-gray-400 ml-2">FY {analytics.financialYear} (Apr 1 → Mar 31)</span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Leads Over Time */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" /> Leads Over Time
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics.leadsOverTime}>
                    <defs>
                      <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2.5} fill="url(#leadGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Sales & Revenue */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Sales & Revenue
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.salesOverTime}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Sales" fill="url(#salesGrad)" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue ₹" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stage Distribution Pie */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-violet-500" /> Stage Distribution
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analytics.stageDistribution.map((s: any, i: number) => ({
                        name: stages.find(st => st.key === s.stage)?.name || s.stage,
                        value: s.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {analytics.stageDistribution.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS.chart[i % COLORS.chart.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Messages Over Time */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-500" /> Messages Sent
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics.messagesOverTime}>
                    <defs>
                      <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} fill="url(#msgGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Country Breakdown */}
              {analytics.countryBreakdown?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-cyan-500" /> Country Breakdown
                  </h3>
                  <div className="space-y-3">
                    {analytics.countryBreakdown.map((c: any, i: number) => {
                      const pct = analytics.summary.totalLeads > 0 ? Math.round((c.count / analytics.summary.totalLeads) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{c.country}</span>
                            <span className="text-gray-500">{c.count} leads · {c.conversionRate}% conv.</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORS.chart[i % COLORS.chart.length]}, ${COLORS.chart[(i + 1) % COLORS.chart.length]})` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Region Breakdown (North/South India) */}
              {analytics.regionBreakdown?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-500" /> India: North vs South
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {analytics.regionBreakdown.filter((r: any) => r.region !== 'Unknown').map((r: any) => {
                      const isNorth = r.region === 'North India';
                      const color = isNorth ? COLORS.northIndia : COLORS.southIndia;
                      return (
                        <div
                          key={r.region}
                          className="rounded-xl p-4 text-center border"
                          style={{ backgroundColor: color.bg, borderColor: `${color.main}30` }}
                        >
                          <div className="text-2xl mb-1">{isNorth ? '🏔️' : '🌴'}</div>
                          <div className="text-2xl font-bold" style={{ color: color.main }}>{r.count}</div>
                          <div className="text-sm font-medium text-gray-700">{r.region}</div>
                          <div className="text-xs text-gray-500 mt-1">{r.conversionRate}% conversion</div>
                          <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.conversionRate}%`, backgroundColor: color.main }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* State breakdown */}
                  {analytics.stateBreakdown?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Top States</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {analytics.stateBreakdown.slice(0, 15).map((s: any, i: number) => {
                          const maxCount = analytics.stateBreakdown[0]?.count || 1;
                          const isSouth = s.region === 'South India';
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs w-4">{isSouth ? '🌴' : '🏔️'}</span>
                              <span className="text-xs text-gray-600 w-32 truncate">{s.state}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${(s.count / maxCount) * 100}%`,
                                    backgroundColor: isSouth ? COLORS.southIndia.main : COLORS.northIndia.main,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-8 text-right">{s.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Language Breakdown */}
              {analytics.languageBreakdown?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Languages className="h-4 w-4 text-pink-500" /> Language Breakdown
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.languageBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                      <YAxis dataKey="language" type="category" width={80} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                      <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
                        {analytics.languageBreakdown.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS.chart[i % COLORS.chart.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Conversion Funnel Chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Conversion Progress
                </h3>
                <div className="space-y-3">
                  {stages.map((stage, idx) => {
                    const count = stageCounts[stage.key] || 0;
                    const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                    const color = getStageColor(idx);
                    const Icon = getStageIcon(stage.icon);
                    return (
                      <div key={stage.key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" style={{ color: color.main }} />
                            <span className="font-medium text-gray-700">{stage.name}</span>
                          </div>
                          <span className="text-gray-500">{count} ({pct}%)</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color.main}, ${color.light})` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Edit Stages Modal ── */}
        {editingStages && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingStages(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Edit Funnel Stages</h2>
                <button onClick={() => setEditingStages(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>

              {/* Funnel Name */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Funnel Name</label>
                <input
                  type="text"
                  value={editFunnelName}
                  onChange={e => setEditFunnelName(e.target.value)}
                  placeholder="Enter funnel name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>

              {/* Stages */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {editStages.map((stage, idx) => (
                  <div key={stage.key || idx} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 group">
                    <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      value={stage.name}
                      onChange={e => {
                        const updated = [...editStages];
                        const newName = e.target.value;
                        // Auto-generate key from name for new stages (key starts with 'stage_')
                        const newKey = stage.key.startsWith('stage_')
                          ? newName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || stage.key
                          : stage.key;
                        updated[idx] = { ...updated[idx], name: newName, key: newKey };
                        setEditStages(updated);
                      }}
                      placeholder="Stage name"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    />
                    <input
                      type="color"
                      value={stage.color}
                      onChange={e => {
                        const updated = [...editStages];
                        updated[idx] = { ...updated[idx], color: e.target.value };
                        setEditStages(updated);
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={stage.description}
                      onChange={e => {
                        const updated = [...editStages];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setEditStages(updated);
                      }}
                      placeholder="Description"
                      className="w-40 px-2 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    />
                    <button
                      onClick={() => removeEditStage(idx)}
                      title="Remove stage"
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Stage Button */}
              <button
                onClick={addNewStage}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition"
              >
                <Plus className="h-4 w-4" /> Add New Stage
              </button>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setEditingStages(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition">Cancel</button>
                <button
                  onClick={saveStageConfig}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Lead Detail Modal */}
      {selectedLeadId && token && (
        <LeadDetailModal
          leadId={selectedLeadId}
          token={token}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={() => { fetchLeads(); fetchAnalytics(); }}
          stages={stages.map(s => ({ key: s.key, name: s.name, color: s.color }))}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Broadcast Modal */}
      <AddToBroadcastModal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        leads={selectedLeadIds.size > 0
          ? leads.filter(l => selectedLeadIds.has(l._id))
          : leads
        }
        token={token || undefined}
        onSuccess={() => { setBroadcastModalOpen(false); setSelectedLeadIds(new Set()); }}
      />
    </div>
  );
}
