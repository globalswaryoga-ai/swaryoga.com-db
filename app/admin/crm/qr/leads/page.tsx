'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Users, Search, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Phone, Mail, Tag, Calendar, Globe, Filter, X, Eye, Edit3, Trash2,
  MessageSquare, Plus, ArrowUpDown, CheckSquare, Square, Download,
} from 'lucide-react';
import LeadDetailModal from '@/components/admin/crm/LeadDetailModal';

const QR_SOURCE = 'qr_whatsapp';

const STATUS_COLORS: Record<string, string> = {
  new_lead:     'bg-blue-50 text-blue-700 border-blue-200',
  contacted:    'bg-cyan-50 text-cyan-700 border-cyan-200',
  interested:   'bg-violet-50 text-violet-700 border-violet-200',
  demo_trial:   'bg-amber-50 text-amber-700 border-amber-200',
  negotiation:  'bg-orange-50 text-orange-700 border-orange-200',
  enrolled:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed:    'bg-green-50 text-green-700 border-green-200',
  inactive:     'bg-gray-50 text-gray-500 border-gray-200',
  repeater:     'bg-teal-50 text-teal-700 border-teal-200',
  old_sadhak:   'bg-pink-50 text-pink-700 border-pink-200',
  only_for_post:'bg-purple-50 text-purple-700 border-purple-200',
  lead:         'bg-blue-50 text-blue-700 border-blue-200',
  hot:          'bg-red-50 text-red-700 border-red-200',
  prospect:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  customer:     'bg-emerald-50 text-emerald-700 border-emerald-200',
};

interface Lead {
  _id: string;
  leadNumber?: string;
  name: string;
  email?: string;
  phoneNumber: string;
  status: string;
  source: string;
  labels: string[];
  workshopName?: string;
  funnelStage?: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function QRLeadsPage() {
  const router = useRouter();
  const token = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [limit] = useState(25);
  const [skip, setSkip] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');

  const fetchLeads = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(limit),
        skip: String(skip),
        source: QR_SOURCE,
      };
      if (filterStatus) params.status = filterStatus;
      if (search) params.q = search;

      const res = await fetch('/api/admin/crm/leads?' + new URLSearchParams(params), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data?.leads || []);
        setTotal(json.data?.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch QR leads:', e);
    } finally {
      setLoading(false);
    }
  }, [token, limit, skip, filterStatus, search]);

  // Fetch status counts
  const fetchCounts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/leads?source=' + QR_SOURCE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setStatusCounts(json.data?.stageCounts || {});
      }
    } catch (e) {
      console.error('Failed to fetch counts:', e);
    }
  }, [token]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l._id)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this lead?')) return;
    try {
      await fetch(`/api/admin/crm/leads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLeads();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const totalLeads = Object.values(statusCounts).reduce((s, c) => s + c, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              QR WhatsApp Leads
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} leads from QR WhatsApp</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchLeads(); fetchCounts(); }} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stage Counts Bar */}
      <div className="bg-white border-b px-6 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => { setFilterStatus(''); setSkip(0); }}
          className={`px-2.5 py-1 text-xs rounded-full font-medium border transition whitespace-nowrap ${!filterStatus ? 'bg-green-50 text-green-700 border-green-300 ring-1 ring-green-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
        >
          All <span className="text-[10px] ml-0.5 px-1 rounded-full bg-gray-100">{totalLeads}</span>
        </button>
        {Object.entries(statusCounts).map(([stage, count]) => (
          <button
            key={stage}
            onClick={() => { setFilterStatus(stage); setSkip(0); }}
            className={`px-2.5 py-1 text-xs rounded-full font-medium border transition whitespace-nowrap ${filterStatus === stage ? (STATUS_COLORS[stage] || 'bg-gray-100 text-gray-700') + ' ring-1 ring-current' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
          >
            {stage.replace(/_/g, ' ')} <span className="text-[10px] ml-0.5 px-1 rounded-full bg-gray-100">{count}</span>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="px-6 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setSkip(0); }}
            placeholder="Search by name, phone, email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
        )}
      </div>

      {/* Table */}
      <div className="px-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left w-8">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                    {selectedIds.size === leads.length && leads.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">#</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Phone</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Labels</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Created</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-2 text-xs text-gray-400">Loading leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                    {search || filterStatus ? 'No leads match your filters' : 'No QR WhatsApp leads found'}
                  </td>
                </tr>
              ) : (
                leads.map((lead, i) => (
                  <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                    <td className="px-3 py-2">
                      <button onClick={() => toggleSelect(lead._id)} className="text-gray-400 hover:text-gray-600">
                        {selectedIds.has(lead._id) ? <CheckSquare className="w-4 h-4 text-green-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{lead.leadNumber || skip + i + 1}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => setSelectedLeadId(lead._id)} className="text-left hover:text-green-700 font-medium text-gray-900">
                        {lead.name || 'Unknown'}
                      </button>
                      {lead.email && <p className="text-xs text-gray-400 mt-0.5">{lead.email}</p>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 font-mono text-xs">{lead.phoneNumber}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full border ${STATUS_COLORS[lead.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {(lead.funnelStage || lead.status || 'new_lead').replace(/_/g, ' ')}
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
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedLeadId(lead._id)} className="p-1 rounded hover:bg-green-50" title="View">
                          <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/crm/qr?phone=${lead.phoneNumber}`)}
                          className="p-1 rounded hover:bg-green-50" title="Chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                        </button>
                        <button onClick={() => handleDelete(lead._id)} className="p-1 rounded hover:bg-red-50" title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                  disabled={skip === 0}
                  className="p-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 px-2">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setSkip(skip + limit)}
                  disabled={skip + limit >= total}
                  className="p-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lead Detail Modal */}
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
