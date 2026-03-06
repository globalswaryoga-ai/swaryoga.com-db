'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Sparkles, Phone, Heart, Play, Handshake, CheckCircle, Trophy,
  Users, Send, Mail, Eye, Search, RefreshCw, ChevronDown,
  X, Filter, ArrowLeftRight,
  Calendar, Globe, MoreHorizontal,
  PauseCircle, Repeat, Flower2, Megaphone,
  Pencil, MessageSquare, Tag, Plus, Check,
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight,
} from 'lucide-react';
import LeadDetailModal from '@/components/admin/crm/LeadDetailModal';

const QR_SOURCE = 'qr_whatsapp';

const STAGE_COLORS = [
  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
  { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  { main: '#06B6D4', light: '#22D3EE', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
  { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  { main: '#6B7280', light: '#9CA3AF', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' },
  { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  { main: '#14B8A6', light: '#2DD4BF', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)' },
  { main: '#A855F7', light: '#C084FC', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
];

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
  updatedAt: string; country?: string; language?: string; title?: string;
  displayName?: string; firstTouchedAt?: string;
}

export default function QRManageFunnelPage() {
  const router = useRouter();
  const token = useAuth();

  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [bulkStageTarget, setBulkStageTarget] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  // Fetch funnel config
  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/config', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStages((json.data?.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ source: QR_SOURCE });
      if (searchQuery) {
        params.set('all', '1');
        params.set('search', searchQuery);
      } else if (activeStage) {
        params.set('stage', activeStage);
      } else {
        params.set('all', '1');
      }
      params.set('limit', String(LIMIT));
      params.set('skip', String(page * LIMIT));

      const res = await fetch(`/api/admin/crm/funnel/leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStageCounts(json.data?.stageCounts || {});
        setLeads(json.data?.leads || []);
        setTotalLeads(json.data?.totalLeads || 0);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, activeStage, searchQuery, page]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Move lead to a different stage
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

  // Bulk move
  const bulkMove = async () => {
    if (!token || !bulkStageTarget || selectedLeadIds.size === 0) return;
    try {
      const promises = Array.from(selectedLeadIds).map(id =>
        fetch('/api/admin/crm/funnel/move', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: id, toStage: bulkStageTarget }),
        })
      );
      await Promise.all(promises);
      setSelectedLeadIds(new Set());
      setBulkStageTarget('');
      setShowBulkActions(false);
      fetchLeads();
    } catch (e) { console.error(e); }
  };

  const totalAll = Object.values(stageCounts).reduce((s, c) => s + c, 0);
  const selectAll = selectedLeadIds.size === leads.length && leads.length > 0;
  const totalPages = Math.ceil(totalLeads / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5 text-green-600" />
              QR WhatsApp — Manage Funnel
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalAll} leads · {stages.length} stages</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedLeadIds.size > 0 && (
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Move {selectedLeadIds.size} leads
              </button>
            )}
            <button onClick={fetchLeads} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Bulk move dropdown */}
        {showBulkActions && selectedLeadIds.size > 0 && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-green-700 font-medium">{selectedLeadIds.size} selected → Move to:</span>
            <select
              value={bulkStageTarget}
              onChange={e => setBulkStageTarget(e.target.value)}
              className="text-sm border border-green-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select stage...</option>
              {stages.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
            <button onClick={bulkMove} disabled={!bulkStageTarget} className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Check className="w-3.5 h-3.5 inline mr-1" /> Apply
            </button>
            <button onClick={() => { setShowBulkActions(false); setSelectedLeadIds(new Set()); }} className="px-3 py-1 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-100">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Funnel Stage Tabs */}
      <div className="bg-white border-b px-6 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => { setActiveStage(''); setPage(0); }}
          className={`px-3 py-1.5 text-xs rounded-full font-medium border transition whitespace-nowrap ${!activeStage ? 'bg-green-50 text-green-700 border-green-300 ring-1 ring-green-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
        >
          All <span className="text-[10px] ml-1 px-1 rounded-full bg-gray-100">{totalAll}</span>
        </button>
        {stages.map((stage, i) => {
          const color = STAGE_COLORS[i % STAGE_COLORS.length];
          const count = stageCounts[stage.key] || 0;
          const isActive = activeStage === stage.key;
          const Icon = STAGE_ICONS[stage.icon] || Sparkles;
          return (
            <button
              key={stage.key}
              onClick={() => { setActiveStage(isActive ? '' : stage.key); setPage(0); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium border transition whitespace-nowrap ${
                isActive ? 'ring-1 ring-offset-1 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
              style={isActive ? { background: color.bg, borderColor: color.main, color: color.main } : {}}
            >
              <Icon className="w-3 h-3" style={isActive ? { color: color.main } : {}} />
              {stage.name}
              <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-white/60' : 'bg-gray-100'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="px-6 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Search leads by name, phone, email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={() => {
                      if (selectAll) setSelectedLeadIds(new Set());
                      else setSelectedLeadIds(new Set(leads.map(l => l._id)));
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Stage</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Labels</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Move to</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-2 text-xs text-gray-400">Loading leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                    {searchQuery ? 'No leads match your search' : activeStage ? 'No leads in this stage' : 'No QR WhatsApp leads found'}
                  </td>
                </tr>
              ) : (
                leads.map((lead, i) => {
                  const stageIdx = stages.findIndex(s => s.key === (lead.funnelStage || 'new_lead'));
                  const stageColor = STAGE_COLORS[stageIdx >= 0 ? stageIdx % STAGE_COLORS.length : 0];
                  const stageName = stages.find(s => s.key === (lead.funnelStage || 'new_lead'))?.name || lead.funnelStage || 'New Lead';
                  return (
                    <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead._id)}
                          onChange={() => {
                            setSelectedLeadIds(prev => {
                              const next = new Set(prev);
                              next.has(lead._id) ? next.delete(lead._id) : next.add(lead._id);
                              return next;
                            });
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{lead.leadNumber || page * LIMIT + i + 1}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => setSelectedLeadId(lead._id)} className="text-left hover:text-green-700 font-medium text-gray-900">
                          {lead.title ? `${lead.title}. ` : ''}{lead.name || lead.displayName || 'Unknown'}
                        </button>
                        {lead.email && <p className="text-xs text-gray-400 mt-0.5">{lead.email}</p>}
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-mono text-xs">{lead.phoneNumber}</td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full border"
                          style={{ background: stageColor.bg, borderColor: stageColor.border, color: stageColor.main }}
                        >
                          {stageName}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(lead.labels || []).slice(0, 3).map(l => (
                            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{l}</span>
                          ))}
                          {(lead.labels || []).length > 3 && (
                            <span className="text-[10px] text-gray-400">+{lead.labels.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value=""
                          onChange={e => { if (e.target.value) moveLead(lead._id, e.target.value); }}
                          className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 focus:ring-1 focus:ring-green-500 w-24"
                        >
                          <option value="">Move...</option>
                          {stages.filter(s => s.key !== lead.funnelStage).map(s => (
                            <option key={s.key} value={s.key}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedLeadId(lead._id)} className="p-1 rounded hover:bg-green-50" title="View details">
                            <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                          </button>
                          <button onClick={() => router.push(`/admin/crm/qr?phone=${lead.phoneNumber}`)} className="p-1 rounded hover:bg-green-50" title="Chat on QR">
                            <MessageSquare className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, totalLeads)} of {totalLeads}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="p-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 px-2">Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={page + 1 >= totalPages}
                  className="p-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedLeadId && token && (
        <LeadDetailModal
          leadId={selectedLeadId}
          token={token}
          onClose={() => { setSelectedLeadId(null); fetchLeads(); }}
        />
      )}
    </div>
  );
}
