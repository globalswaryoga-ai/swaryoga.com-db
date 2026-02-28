'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Sparkles, Phone, Heart, Play, Handshake, CheckCircle, Trophy,
  Users, Send, Mail, Eye, Search, RefreshCw, ChevronDown, ChevronRight,
  X, ArrowLeftRight,
  Calendar, ChevronLeft, Link2, Check,
  PauseCircle, Repeat, Flower2, Megaphone,
  MessageSquare, PhoneCall, Bot, History, Plus,
  CalendarClock, ListChecks, PhoneIncoming, PhoneOutgoing, Loader2,
} from 'lucide-react';
import LeadDetailModal from '@/components/admin/crm/LeadDetailModal';
import AICallModal from '@/components/admin/crm/AICallModal';

// ── Color palette (matches funnel) ──
const COLORS = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' },
  cyan:    { main: '#06B6D4', light: '#22D3EE', bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  pageBg:  '#F8FAFC',
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
  key: string; name: string; color: string; colorGradient: string;
  order: number; icon: string; isDefault: boolean; description: string;
}

interface Lead {
  _id: string; leadNumber?: string; name: string; phoneNumber: string;
  email?: string; status: string; labels: string[]; source: string;
  workshopName?: string; funnelStage: string; assignedToUserId?: string;
  lastMessageAt?: string; chatStatus?: string; createdAt: string;
  updatedAt: string; country?: string; countryCode?: string;
  region?: string; state?: string; language?: string; languageCode?: string;
  title?: string; displayName?: string;
  firstTouchedAt?: string;
}

interface AdminUser {
  userId: string; name?: string; email?: string;
}

// ── Month options for last 24 months ──
function getMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [{ value: '', label: 'All Months' }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const lbl = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    opts.push({ value: val, label: lbl });
  }
  return opts;
}
const MONTH_OPTIONS = getMonthOptions();

const DEFAULT_CONNECTIONS = [
  'Signup', 'Whatsapp', 'Community', 'Website', 'Email', 'Facebook', 'Social media', 'Crm upload',
];

export default function CallWorkflowPage() {
  const router = useRouter();
  const token = useAuth();

  // Data
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    labels: string[]; workshops: string[]; countries: string[]; languages: string[];
  }>({ labels: [], workshops: [], countries: [], languages: [] });

  // UI state
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterWorkshop, setFilterWorkshop] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [customConnections, setCustomConnections] = useState<string[]>([]);

  // Custom filter options from DB
  const [customFilterOptions, setCustomFilterOptions] = useState<{ country: string[]; workshop: string[]; connection: string[] }>({ country: [], workshop: [], connection: [] });
  const [isAddingCountry, setIsAddingCountry] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [isAddingWorkshop, setIsAddingWorkshop] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState('');

  const allConnections = [...new Set([...DEFAULT_CONNECTIONS, ...customFilterOptions.connection, ...customConnections])];
  const allCountries = [...new Set([...filterOptions.countries, ...customFilterOptions.country])].sort();
  const allWorkshops = [...new Set([...filterOptions.workshops, ...customFilterOptions.workshop])].sort();

  // Selection & modals
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [connectionDropdownLeadId, setConnectionDropdownLeadId] = useState<string | null>(null);
  const [aiCallLeadId, setAiCallLeadId] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Call history popup
  const [callHistoryLeadId, setCallHistoryLeadId] = useState<string | null>(null);
  const [callHistory, setCallHistory] = useState<Array<{ _id: string; purpose: string; status: string; language: string; duration: number; summary: string; sentiment: string; callEndedReason: string; crmUpdates: any[]; createdAt: string }>>([]);
  const [callHistoryLoading, setCallHistoryLoading] = useState(false);

  // Schedule call
  const [scheduleLeadId, setScheduleLeadId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');

  // Updates popup (all call records for a lead)
  const [updatesLeadId, setUpdatesLeadId] = useState<string | null>(null);
  const [updatesCallHistory, setUpdatesCallHistory] = useState<Array<{ _id: string; purpose: string; status: string; language: string; duration: number; summary: string; sentiment: string; callEndedReason: string; crmUpdates: any[]; createdAt: string }>>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  // Bulk calling
  const [bulkCalling, setBulkCalling] = useState(false);
  const [bulkCallProgress, setBulkCallProgress] = useState({ done: 0, total: 0, failed: 0 });

  const selectAll = selectedLeadIds.size === leads.length && leads.length > 0;

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('admin_user') || '{}');
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setIsSuperAdmin((u?.userId === 'admin' || u?.userId === 'admincrm') || perms.includes('all'));
    } catch { setIsSuperAdmin(false); }
  }, []);

  const fetchCustomFilterOptions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/filter-options', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.options) setCustomFilterOptions(json.data.options);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const addCustomFilterOption = async (category: 'country' | 'workshop' | 'connection', value: string) => {
    if (!token || !value.trim()) return;
    try {
      const res = await fetch('/api/admin/crm/filter-options', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, value: value.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.values) setCustomFilterOptions(prev => ({ ...prev, [category]: json.data.values }));
      }
    } catch (e) { console.error(e); }
  };

  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/config', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStages((json.data.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchAdminUsers = useCallback(async () => {
    if (!token || !isSuperAdmin) return;
    try {
      const res = await fetch('/api/admin/auth/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setAdminUsers(
          (Array.isArray(json?.data) ? json.data : [])
            .map((u: any) => ({ userId: String(u?.userId || ''), name: u?.name, email: u?.email }))
            .filter((u: AdminUser) => u.userId)
        );
      }
    } catch (e) { console.error(e); }
  }, [token, isSuperAdmin]);

  const fetchLeads = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (searchQuery) { params.set('all', '1'); params.set('search', searchQuery); }
      else if (activeStage) { params.set('stage', activeStage); }
      else { params.set('all', '1'); }
      if (filterCountry) params.set('country', filterCountry);
      if (filterLanguage) params.set('language', filterLanguage);
      if (filterAdmin) params.set('assignedTo', filterAdmin);
      if (filterWorkshop) params.set('workshop', filterWorkshop);
      if (filterLabel) params.set('label', filterLabel);
      if (filterMonth) params.set('month', filterMonth);
      params.set('limit', String(LIMIT));
      params.set('skip', String(page * LIMIT));

      const res = await fetch(`/api/admin/crm/funnel/leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStageCounts(json.data.stageCounts || {});
        setLeads(json.data.leads || []);
        setTotalLeads(json.data.totalLeads || 0);
        if (json.data.filters) setFilterOptions(json.data.filters);
      }
    } catch (e) { console.error(e); }
  }, [token, activeStage, searchQuery, filterCountry, filterLanguage, filterAdmin, filterWorkshop, filterLabel, filterMonth, page]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchAdminUsers(), fetchCustomFilterOptions()]);
      setLoading(false);
    };
    if (token) load();
  }, [token, fetchConfig, fetchAdminUsers, fetchCustomFilterOptions]);

  useEffect(() => { if (token) fetchLeads(); }, [token, fetchLeads]);
  useEffect(() => { setPage(0); }, [activeStage, searchQuery, filterCountry, filterLanguage, filterAdmin, filterWorkshop, filterLabel, filterMonth]);

  const moveLead = async (leadId: string, toStage: string) => {
    if (!token) return;
    try {
      await fetch('/api/admin/crm/funnel/move', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, toStage }),
      });
      fetchLeads();
    } catch (e) { console.error(e); }
  };

  const bulkMoveLeads = async (toStage: string) => {
    if (!token || selectedLeadIds.size === 0) return;
    try {
      await Promise.all(Array.from(selectedLeadIds).map(id =>
        fetch('/api/admin/crm/funnel/move', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: id, toStage }),
        })
      ));
      setSelectedLeadIds(new Set());
      fetchLeads();
    } catch (e) { console.error(e); }
  };

  const toggleConnection = async (leadId: string, connection: string) => {
    if (!token || !connection.trim()) return;
    try {
      const lead = leads.find(l => l._id === leadId);
      const current = lead?.labels || [];
      const has = current.includes(connection.trim());
      const updated = has ? current.filter(c => c !== connection.trim()) : [...current, connection.trim()];
      await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: updated }),
      });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, labels: updated } : l));
    } catch (e) { console.error(e); }
  };

  const fetchCallHistory = async (leadId: string) => {
    setCallHistoryLeadId(leadId);
    setCallHistoryLoading(true);
    setCallHistory([]);
    try {
      const res = await fetch(`/api/admin/crm/calls?leadId=${leadId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setCallHistory(json.data?.calls || []); }
    } catch (_) { /* ignore */ }
    setCallHistoryLoading(false);
  };

  const fetchUpdates = async (leadId: string) => {
    setUpdatesLeadId(leadId);
    setUpdatesLoading(true);
    setUpdatesCallHistory([]);
    try {
      const res = await fetch(`/api/admin/crm/calls?leadId=${leadId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setUpdatesCallHistory(json.data?.calls || []); }
    } catch (_) { /* ignore */ }
    setUpdatesLoading(false);
  };

  const handleBulkCall = async (lang: 'hi' | 'en' | 'other', direction: 'outbound' | 'inbound') => {
    if (!token || selectedLeadIds.size === 0 || bulkCalling) return;
    const ids = Array.from(selectedLeadIds);
    setBulkCalling(true);
    setBulkCallProgress({ done: 0, total: ids.length, failed: 0 });
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        await fetch('/api/admin/crm/calls', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: ids[i], purpose: direction === 'inbound' ? 'follow_up' : 'welcome', language: lang === 'other' ? 'en' : lang }),
        });
      } catch { failed++; }
      setBulkCallProgress({ done: i + 1, total: ids.length, failed });
    }
    setBulkCalling(false);
    fetchLeads();
  };

  const toggleSelectAll = () => {
    if (selectAll) setSelectedLeadIds(new Set());
    else setSelectedLeadIds(new Set(leads.map(l => l._id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedLeadIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const getStageColor = (idx: number) => STAGE_COLORS[idx % STAGE_COLORS.length];
  const getStageIcon = (icon: string) => STAGE_ICONS[icon] || Sparkles;
  const totalPipelineLeads = Object.values(stageCounts).reduce((s, c) => s + c, 0);
  const totalPages = Math.ceil(totalLeads / LIMIT);

  const sortedLeads = [...leads].sort((a, b) => {
    const aNew = (!a.funnelStage || a.funnelStage === 'new_lead') ? 1 : 0;
    const bNew = (!b.funnelStage || b.funnelStage === 'new_lead') ? 1 : 0;
    return bNew - aNew;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading Call Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: COLORS.pageBg }}>
      {/* ═══ Sidebar: Pipeline Stages ═══ */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 bg-white border-r border-gray-100 transition-all duration-300 flex flex-col`} style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="px-3 py-4 border-b border-gray-100 flex items-center justify-between">
          {!sidebarCollapsed && <h3 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">Pipeline</h3>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* All leads */}
        <button
          onClick={() => setActiveStage('')}
          className={`w-full px-3 py-3 flex items-center gap-3 transition text-left border-b border-gray-50 ${!activeStage ? 'bg-indigo-50/80' : 'hover:bg-gray-50/80'}`}
          style={!activeStage ? { borderLeft: `3px solid ${COLORS.indigo.main}` } : { borderLeft: '3px solid transparent' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.indigo.main}, ${COLORS.violet.main})` }}>
            <Users className="h-4 w-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-800">All Leads</div>
              <div className="text-xs text-gray-400">{totalPipelineLeads}</div>
            </div>
          )}
        </button>

        {/* Stage buttons */}
        <div className="flex-1 overflow-y-auto">
          {stages.map((stage, idx) => {
            const color = getStageColor(idx);
            const Icon = getStageIcon(stage.icon);
            const count = stageCounts[stage.key] || 0;
            const isActive = activeStage === stage.key;
            return (
              <button
                key={stage.key}
                onClick={() => setActiveStage(isActive ? '' : stage.key)}
                className={`w-full px-3 py-3 flex items-center gap-3 transition text-left border-b border-gray-50 ${isActive ? '' : 'hover:bg-gray-50/80'}`}
                style={{ backgroundColor: isActive ? color.bg : undefined, borderLeft: isActive ? `3px solid ${color.main}` : '3px solid transparent' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${color.main}, ${color.light})` }}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">{stage.name}</div>
                    <div className="text-xs text-gray-400">{count} leads</div>
                  </div>
                )}
                {!sidebarCollapsed && <div className="text-lg font-bold flex-shrink-0" style={{ color: color.main }}>{count}</div>}
              </button>
            );
          })}
        </div>

        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-t border-gray-100">
            <button onClick={() => router.push('/admin/crm/funnel')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Funnel Dashboard
            </button>
          </div>
        )}
      </aside>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/admin/crm')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-80 transition shadow-sm" style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }} title="Back to CRM">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {activeStage ? stages.find(s => s.key === activeStage)?.name || 'Leads' : 'All Pipeline Leads'} &mdash; Call Manager
                </h1>
                <p className="text-xs text-gray-400">{totalLeads} leads{activeStage ? ' in this stage' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Bulk actions */}
              {selectedLeadIds.size > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 flex-wrap" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06))' }}>
                  <span className="text-[11px] font-semibold text-indigo-700 whitespace-nowrap">{selectedLeadIds.size} selected</span>
                  <div className="h-3.5 w-px bg-indigo-200" />
                  {/* Bulk Call buttons */}
                  {bulkCalling ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-medium">
                      <Loader2 className="h-3 w-3 animate-spin" /> {bulkCallProgress.done}/{bulkCallProgress.total}{bulkCallProgress.failed > 0 && <span className="text-red-500"> ({bulkCallProgress.failed} failed)</span>}
                    </div>
                  ) : (
                    <>
                      <button onClick={() => handleBulkCall('hi', 'outbound')} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}>
                        <Bot className="h-3 w-3" /> Bulk Hindi
                      </button>
                      <button onClick={() => handleBulkCall('en', 'outbound')} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}>
                        <Bot className="h-3 w-3" /> Bulk English
                      </button>
                      <button onClick={() => handleBulkCall('other', 'outbound')} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 transition">
                        <Bot className="h-3 w-3" /> Bulk Other
                      </button>
                      <div className="h-3.5 w-px bg-indigo-200" />
                      <button onClick={() => handleBulkCall('hi', 'inbound')} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                        <PhoneIncoming className="h-3 w-3" /> Inbound
                      </button>
                      <button onClick={() => handleBulkCall('hi', 'outbound')} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition">
                        <PhoneOutgoing className="h-3 w-3" /> Outbound
                      </button>
                    </>
                  )}
                  <div className="h-3.5 w-px bg-indigo-200" />
                  <div className="relative">
                    <button onClick={() => setShowBulkActions(!showBulkActions)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 transition">
                      <ArrowLeftRight className="h-3 w-3" /> Move <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                    {showBulkActions && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                        {stages.map((s, idx) => (
                          <button key={s.key} onClick={() => { bulkMoveLeads(s.key); setShowBulkActions(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: getStageColor(idx).main }} />{s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setSelectedLeadIds(new Set())} className="flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition"><X className="h-3 w-3" /></button>
                </div>
              )}
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name, phone..." className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm w-52 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
              </div>
              <button onClick={() => fetchLeads()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition shadow-sm">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {isSuperAdmin && (
              <select value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none flex-shrink-0">
                <option value="">All Admins</option>
                {adminUsers.map(a => <option key={a.userId} value={a.userId}>{a.name || a.userId}</option>)}
              </select>
            )}
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none flex-shrink-0">
              {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none flex-shrink-0">
              <option value="">All Languages</option>
              {filterOptions.languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            {/* Country with + */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none">
                <option value="">All Countries</option>
                {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {isAddingCountry ? (
                <div className="flex items-center gap-0.5">
                  <input type="text" value={newCountry} onChange={e => setNewCountry(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCountry.trim()) { addCustomFilterOption('country', newCountry.trim()); setNewCountry(''); setIsAddingCountry(false); } else if (e.key === 'Escape') { setNewCountry(''); setIsAddingCountry(false); } }} placeholder="New country..." autoFocus className="px-2 py-1.5 rounded-lg border border-indigo-300 text-sm w-28 focus:ring-2 focus:ring-indigo-200 outline-none" />
                  <button onClick={() => { if (newCountry.trim()) addCustomFilterOption('country', newCountry.trim()); setNewCountry(''); setIsAddingCountry(false); }} className="p-1 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition"><Check className="h-3 w-3" /></button>
                  <button onClick={() => { setNewCountry(''); setIsAddingCountry(false); }} className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingCountry(true)} title="Add country" className="p-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition border border-dashed border-indigo-300">+</button>
              )}
            </div>

            {/* Workshop with + */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <select value={filterWorkshop} onChange={e => setFilterWorkshop(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none">
                <option value="">All Workshops</option>
                {allWorkshops.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {isAddingWorkshop ? (
                <div className="flex items-center gap-0.5">
                  <input type="text" value={newWorkshop} onChange={e => setNewWorkshop(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newWorkshop.trim()) { addCustomFilterOption('workshop', newWorkshop.trim()); setNewWorkshop(''); setIsAddingWorkshop(false); } else if (e.key === 'Escape') { setNewWorkshop(''); setIsAddingWorkshop(false); } }} placeholder="New workshop..." autoFocus className="px-2 py-1.5 rounded-lg border border-indigo-300 text-sm w-28 focus:ring-2 focus:ring-indigo-200 outline-none" />
                  <button onClick={() => { if (newWorkshop.trim()) addCustomFilterOption('workshop', newWorkshop.trim()); setNewWorkshop(''); setIsAddingWorkshop(false); }} className="p-1 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition"><Check className="h-3 w-3" /></button>
                  <button onClick={() => { setNewWorkshop(''); setIsAddingWorkshop(false); }} className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingWorkshop(true)} title="Add workshop" className="p-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition border border-dashed border-indigo-300">+</button>
              )}
            </div>

            {/* Connection with + */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <select value={filterLabel} onChange={e => setFilterLabel(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none">
                <option value="">All Connections</option>
                {allConnections.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {isAddingLabel ? (
                <div className="flex items-center gap-0.5">
                  <input type="text" value={newFilterLabel} onChange={e => setNewFilterLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newFilterLabel.trim()) { addCustomFilterOption('connection', newFilterLabel.trim()); if (!allConnections.includes(newFilterLabel.trim())) setCustomConnections(prev => [...prev, newFilterLabel.trim()]); setNewFilterLabel(''); setIsAddingLabel(false); } else if (e.key === 'Escape') { setNewFilterLabel(''); setIsAddingLabel(false); } }} placeholder="New connection..." autoFocus className="px-2 py-1.5 rounded-lg border border-indigo-300 text-sm w-28 focus:ring-2 focus:ring-indigo-200 outline-none" />
                  <button onClick={() => { if (newFilterLabel.trim()) { addCustomFilterOption('connection', newFilterLabel.trim()); if (!allConnections.includes(newFilterLabel.trim())) setCustomConnections(prev => [...prev, newFilterLabel.trim()]); } setNewFilterLabel(''); setIsAddingLabel(false); }} className="p-1 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition"><Check className="h-3 w-3" /></button>
                  <button onClick={() => { setNewFilterLabel(''); setIsAddingLabel(false); }} className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingLabel(true)} title="Add connection" className="p-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition border border-dashed border-indigo-300">+</button>
              )}
            </div>

            {(searchQuery || filterAdmin || filterMonth || filterLanguage || filterCountry || filterWorkshop || filterLabel) && (
              <button onClick={() => { setSearchQuery(''); setFilterAdmin(''); setFilterMonth(''); setFilterLanguage(''); setFilterCountry(''); setFilterWorkshop(''); setFilterLabel(''); }} className="flex items-center gap-1 px-2 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 transition flex-shrink-0">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* ═══ Leads List ═══ */}
        <div className="flex-1 overflow-auto px-4 sm:px-6 py-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50/80 rounded-xl mb-2">
            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select All</span>
            <span className="text-xs text-gray-400 ml-auto">{totalLeads} leads total</span>
          </div>

          {leads.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No leads found. Adjust your filters.</div>}

          {sortedLeads.map((lead) => {
            const stageIdx = stages.findIndex(s => s.key === lead.funnelStage);
            const stageColor = stageIdx >= 0 ? getStageColor(stageIdx) : COLORS.indigo;
            const stageName = stages.find(s => s.key === lead.funnelStage)?.name || lead.funnelStage || 'New Lead';
            const isSelected = selectedLeadIds.has(lead._id);
            const isUntouched = !lead.funnelStage || lead.funnelStage === 'new_lead';

            return (
              <div
                key={lead._id}
                className={`rounded-xl border transition-all duration-150 hover:shadow-md flex ${
                  isUntouched ? 'border-yellow-300 shadow-sm hover:border-yellow-400'
                  : isSelected ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                  : 'bg-white border-gray-100 hover:border-indigo-200 hover:bg-gray-50/30'
                }`}
                style={isUntouched ? { background: 'linear-gradient(90deg, #FFF9E6 0%, #FFFDF5 100%)' } : undefined}
              >
                {/* Left: Lead Info */}
                <div className="flex-1 min-w-0">
                  {/* Row 1 */}
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead._id)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0" />
                    {lead.leadNumber && <span className="text-[11px] text-gray-400 flex-shrink-0 font-mono">#{lead.leadNumber}</span>}
                    {isUntouched && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400 text-yellow-900 flex-shrink-0 animate-pulse">NEW</span>}
                    <button onClick={() => setSelectedLeadId(lead._id)} className="text-sm font-semibold text-gray-800 hover:text-indigo-600 transition truncate text-left flex-shrink-0 max-w-[200px]">
                      {lead.title ? `${lead.title}. ` : ''}{lead.name || lead.displayName || 'Unknown'}
                    </button>
                    <span className="text-xs text-gray-500 font-mono flex-shrink-0">{lead.phoneNumber || '\u2014'}</span>
                    {lead.email && <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1 truncate max-w-[200px]"><Mail className="h-3 w-3" /> {lead.email}</span>}
                    {lead.country && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap flex-shrink-0">{lead.country}</span>}
                    {lead.language && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 flex-shrink-0">{lead.language}</span>}
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium text-white whitespace-nowrap flex-shrink-0" style={{ background: `linear-gradient(135deg, ${stageColor.main}, ${stageColor.light})` }}>{stageName}</span>
                  </div>

                  {/* Row 2 */}
                  <div className="flex items-center gap-2.5 px-4 py-1.5 border-t border-gray-50 bg-gray-50/30">
                    <div className="w-4 flex-shrink-0" />
                    <span className="text-[11px] text-gray-400 flex-shrink-0 flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    {lead.workshopName && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 flex-shrink-0">{lead.workshopName}</span>}
                    {lead.source && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">{lead.source}</span>}

                    {/* Connections dropdown */}
                    <div className="relative flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setConnectionDropdownLeadId(connectionDropdownLeadId === lead._id ? null : lead._id); }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition border ${(lead.labels?.length || 0) > 0 ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                        <Link2 className="h-3 w-3" />
                        {(lead.labels?.length || 0) > 0 ? `${lead.labels!.slice(0, 2).join(', ')}${lead.labels!.length > 2 ? ` +${lead.labels!.length - 2}` : ''}` : 'Connections'}
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                      {connectionDropdownLeadId === lead._id && (
                        <div className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1 max-h-64 overflow-y-auto" onClick={e => e.stopPropagation()}>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Connections</div>
                          {allConnections.map(conn => {
                            const isActive = (lead.labels || []).includes(conn);
                            return (
                              <button key={conn} onClick={() => toggleConnection(lead._id, conn)} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition hover:bg-gray-50 ${isActive ? 'text-indigo-600 font-medium' : 'text-gray-600'}`}>
                                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}>{isActive && <Check className="h-3 w-3" />}</span>
                                {conn}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {lead.lastMessageAt && <span className="text-[11px] text-gray-400 flex-shrink-0 ml-auto">Last msg: {new Date(lead.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </div>

                {/* Right: Call Action Buttons */}
                <div className="flex flex-col gap-1 px-2 py-1 border-l border-gray-100 flex-shrink-0">
                  {/* Row 1 */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setSelectedLeadId(lead._id)} title="View" className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition whitespace-nowrap"><Eye className="h-3 w-3" />View</button>
                    <button onClick={() => setAiCallLeadId(lead._id)} title="AI Call" className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium text-white transition hover:opacity-90 whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}><Bot className="h-3 w-3" />AI Call</button>
                    <a href={`tel:${lead.phoneNumber || ''}`} title="PC Call" className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition whitespace-nowrap"><Phone className="h-3 w-3" />PC Call</a>
                    <button onClick={() => router.push(`/admin/crm/meta?phone=${encodeURIComponent(lead.phoneNumber?.replace(/\D/g, '') || '')}`)} title="WA" className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium text-white transition hover:opacity-90 whitespace-nowrap" style={{ background: '#25D366' }}><Send className="h-3 w-3" />WA</button>
                  </div>
                  {/* Row 2 */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => fetchCallHistory(lead._id)} title="Call Log" className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 transition whitespace-nowrap"><History className="h-3 w-3" />Call Log</button>
                    <button onClick={() => { setScheduleLeadId(lead._id); setScheduleDate(''); }} title="Schedule" className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition whitespace-nowrap"><CalendarClock className="h-3 w-3" />Schedule</button>
                    <div className="relative group">
                      <button title="Move" className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-pink-50 text-pink-600 hover:bg-pink-100 transition whitespace-nowrap"><ArrowLeftRight className="h-3 w-3" />Move</button>
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-40 hidden group-hover:block">
                        {stages.filter(s => s.key !== lead.funnelStage).map((s) => {
                          const c = getStageColor(stages.findIndex(st => st.key === s.key));
                          return <button key={s.key} onClick={() => moveLead(lead._id, s.key)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition"><div className="w-2.5 h-2.5 rounded-full" style={{ background: c.main }} />{s.name}</button>;
                        })}
                      </div>
                    </div>
                    <button onClick={() => fetchUpdates(lead._id)} title="Updates" className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition whitespace-nowrap"><ListChecks className="h-3 w-3" />Updates</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white border-t border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-400">Showing {page * LIMIT + 1}&ndash;{Math.min((page + 1) * LIMIT, totalLeads)} of {totalLeads}</div>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                const p = start + i;
                if (p >= totalPages) return null;
                return <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${page === p ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`} style={page === p ? { background: `linear-gradient(135deg, ${COLORS.indigo.main}, ${COLORS.violet.main})` } : {}}>{p + 1}</button>;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </main>

      {/* ═══ Modals ═══ */}

      {/* Lead Detail */}
      {selectedLeadId && token && (
        <LeadDetailModal
          leadId={selectedLeadId} token={token}
          onClose={() => setSelectedLeadId(null)} onUpdate={() => fetchLeads()}
          adminUsers={adminUsers} labelOptions={allConnections}
          workshopOptions={filterOptions.workshops}
          stages={stages.map(s => ({ key: s.key, name: s.name, color: s.color }))}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* AI Call */}
      {aiCallLeadId && token && (() => {
        const cl = leads.find(l => l._id === aiCallLeadId);
        return <AICallModal leadId={aiCallLeadId} leadName={cl?.displayName || cl?.name || ''} leadPhone={cl?.phoneNumber?.replace(/\D/g, '') || ''} token={token} onClose={() => setAiCallLeadId(null)} />;
      })()}

      {/* Call History Popup */}
      {callHistoryLeadId && (() => {
        const cl = leads.find(l => l._id === callHistoryLeadId);
        if (!cl) return null;
        const fmtDt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const sentimentIcon = (s: string) => s === 'positive' ? '\uD83D\uDE0A' : s === 'negative' ? '\uD83D\uDE1F' : '\uD83D\uDE10';

        return (
          <div className="fixed inset-0 z-[60]" onClick={() => setCallHistoryLeadId(null)}>
            <div className="absolute bottom-6 right-6 w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 48px)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                <button onClick={() => setCallHistoryLeadId(null)} className="p-0.5 rounded hover:bg-white/20 transition flex-shrink-0"><ChevronLeft className="h-5 w-5 text-white" /></button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: '#818CF8', color: 'white' }}>{(cl.name || cl.displayName || '?')[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{cl.title ? `${cl.title}. ` : ''}{cl.name || cl.displayName || 'Unknown'}</p>
                  <p className="text-indigo-200 text-[11px] truncate">Call History &amp; Logs</p>
                </div>
                <button onClick={() => setCallHistoryLeadId(null)} className="p-1 rounded hover:bg-white/20 transition flex-shrink-0"><X className="h-4 w-4 text-white" /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: '400px' }}>
                {callHistoryLoading ? (
                  <div className="flex items-center justify-center py-12"><div className="animate-spin h-6 w-6 border-3 border-indigo-500 border-t-transparent rounded-full" /></div>
                ) : callHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No call history yet</p>
                    <p className="text-xs mt-1">Make the first call using AI Call or PC Call</p>
                  </div>
                ) : callHistory.map(call => (
                  <div key={call._id} className="rounded-xl border border-gray-100 p-3 hover:bg-gray-50/50 transition">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${call.status === 'completed' ? 'bg-green-50 text-green-600' : call.status === 'failed' ? 'bg-red-50 text-red-600' : call.status === 'no_answer' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-600'}`}>{call.status}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{call.purpose}</span>
                      {call.sentiment && <span className="text-xs">{sentimentIcon(call.sentiment)}</span>}
                      <span className="text-[10px] text-gray-400 ml-auto">{fmtDt(call.createdAt)}</span>
                    </div>
                    {call.duration > 0 && <p className="text-[11px] text-gray-500">Duration: {Math.round(call.duration)}s &middot; {call.language || 'hi'}</p>}
                    {call.summary && <p className="text-xs text-gray-600 mt-1 line-clamp-3">{call.summary}</p>}
                    {call.callEndedReason && <p className="text-[10px] text-gray-400 mt-1">Ended: {call.callEndedReason}</p>}
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                <button onClick={() => { setCallHistoryLeadId(null); setAiCallLeadId(cl._id); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}>
                  <Bot className="h-3.5 w-3.5" /> Make AI Call
                </button>
                <a href={`tel:${cl.phoneNumber || ''}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                  <Phone className="h-3.5 w-3.5" /> PC Call
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Updates Popup (all call records) */}
      {updatesLeadId && (() => {
        const ul = leads.find(l => l._id === updatesLeadId);
        if (!ul) return null;
        const fmtDt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const sentimentIcon = (s: string) => s === 'positive' ? '\uD83D\uDE0A' : s === 'negative' ? '\uD83D\uDE1F' : '\uD83D\uDE10';
        const purposeLabel: Record<string, string> = { welcome: '\uD83D\uDE4F Welcome', follow_up: '\uD83D\uDCDE Follow-up', answer_questions: '\uD83D\uDCAC Answer Back', workshop_reminder: '\uD83D\uDCC5 Workshop', collect_info: '\uD83D\uDCCB Collect Info', payment_reminder: '\uD83D\uDCB3 Payment', custom: '\u270F\uFE0F Custom' };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setUpdatesLeadId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh' }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-white/20 text-white">{(ul.name || ul.displayName || '?')[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{ul.title ? `${ul.title}. ` : ''}{ul.name || ul.displayName || 'Unknown'}</p>
                  <p className="text-cyan-100 text-[11px]">All Call Records &amp; Updates</p>
                </div>
                <button onClick={() => setUpdatesLeadId(null)} className="p-1 rounded hover:bg-white/20 transition"><X className="h-4 w-4 text-white" /></button>
              </div>
              <div className="overflow-y-auto px-5 py-4 space-y-2" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                {updatesLoading ? (
                  <div className="flex items-center justify-center py-12"><div className="animate-spin h-6 w-6 border-3 border-cyan-500 border-t-transparent rounded-full" /></div>
                ) : updatesCallHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No call records yet</p>
                  </div>
                ) : updatesCallHistory.map(call => (
                  <div key={call._id} className="rounded-xl border border-gray-100 p-3 hover:bg-gray-50/50 transition">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${call.status === 'completed' ? 'bg-green-50 text-green-600' : call.status === 'failed' ? 'bg-red-50 text-red-600' : call.status === 'no_answer' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-600'}`}>{call.status}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 font-medium">{purposeLabel[call.purpose] || call.purpose}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500">{call.language === 'hi-IN' || call.language === 'hi' ? '\uD83C\uDDEE\uD83C\uDDF3 Hindi' : '\uD83C\uDDEC\uD83C\uDDE7 English'}</span>
                      {call.sentiment && <span className="text-xs">{sentimentIcon(call.sentiment)}</span>}
                      <span className="text-[10px] text-gray-400 ml-auto">{fmtDt(call.createdAt)}</span>
                    </div>
                    {call.duration > 0 && <p className="text-[11px] text-gray-500">Duration: {Math.round(call.duration)}s</p>}
                    {call.summary && <p className="text-xs text-gray-600 mt-1">{call.summary}</p>}
                    {call.callEndedReason && <p className="text-[10px] text-gray-400 mt-1">Ended: {call.callEndedReason}</p>}
                    {call.crmUpdates && call.crmUpdates.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-50">
                        <p className="text-[10px] text-gray-400 font-semibold mb-1">CRM Updates:</p>
                        {call.crmUpdates.map((u: any, i: number) => (
                          <div key={i} className="text-[10px] text-gray-500 flex items-center gap-1"><span className="text-gray-400">{u.field}:</span> <span className="line-through text-red-400">{String(u.oldValue || '—')}</span> → <span className="text-green-600 font-medium">{String(u.newValue)}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
                <button onClick={() => { setUpdatesLeadId(null); setAiCallLeadId(ul._id); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}>
                  <Bot className="h-3.5 w-3.5" /> Make AI Call
                </button>
                <a href={`tel:${ul.phoneNumber || ''}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                  <Phone className="h-3.5 w-3.5" /> PC Call
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Schedule Call Modal */}
      {scheduleLeadId && (() => {
        const sl = leads.find(l => l._id === scheduleLeadId);
        if (!sl) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setScheduleLeadId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Schedule Call</h3>
                <button onClick={() => setScheduleLeadId(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{sl.title ? `${sl.title}. ` : ''}{sl.name || sl.displayName || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{sl.phoneNumber}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Date &amp; Time</label>
                  <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
                </div>
                <button onClick={() => { if (scheduleDate) { alert(`Call scheduled for ${sl.name || 'lead'} at ${new Date(scheduleDate).toLocaleString('en-IN')}`); setScheduleLeadId(null); } }} disabled={!scheduleDate} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}>
                  <CalendarClock className="h-4 w-4" /> Schedule Call
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
