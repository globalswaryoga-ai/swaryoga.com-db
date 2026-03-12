'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import { useCRM } from '@/hooks/useCRM';
import { useSearch } from '@/hooks/useSearch';
import { useModal } from '@/hooks/useModal';
import { useForm } from '@/hooks/useForm';

import * as XLSX from 'xlsx';
import { normalizePhoneForMeta } from '@/lib/utils/phone';
import CSVUploadPanel from '@/components/admin/crm/CSVUploadPanel';
import type { CSVContact, CSVColumnMap } from '@/components/admin/crm/CSVUploadPanel';
import LeadDetailModal from '@/components/admin/crm/LeadDetailModal';

import {
  Users, Search, RefreshCw, ChevronLeft, ChevronRight,
  Phone, Mail, Tag, Calendar, X, Eye, Trash2,
  MessageSquare, Plus, CheckSquare, Square, Download,
  PhoneCall, Upload,
} from 'lucide-react';

const QR_SOURCE = 'qr_whatsapp';

interface Lead {
  _id: string;
  leadNumber?: string;
  assignedToUserId?: string;
  createdByUserId?: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  source: string;
  labels: string[];
  workshopId?: string;
  workshopName?: string;
  funnelStage?: string;
  createdAt: string;
}

type LeadFormValues = {
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  workshopName?: string;
  assignedToUserId?: string;
};

type AdminUserOption = {
  userId: string;
  name?: string;
  email?: string;
  permissions?: string[];
};

const STATUS_COLORS: Record<string, string> = {
  new_lead:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  contacted:     'bg-cyan-50 text-cyan-700 border-cyan-200',
  interested:    'bg-violet-50 text-violet-700 border-violet-200',
  demo_trial:    'bg-amber-50 text-amber-700 border-amber-200',
  negotiation:   'bg-orange-50 text-orange-700 border-orange-200',
  enrolled:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed:     'bg-green-50 text-green-700 border-green-200',
  inactive:      'bg-gray-50 text-gray-500 border-gray-200',
  repeater:      'bg-teal-50 text-teal-700 border-teal-200',
  old_sadhak:    'bg-pink-50 text-pink-700 border-pink-200',
  only_for_post: 'bg-purple-50 text-purple-700 border-purple-200',
  lead:          'bg-indigo-50 text-indigo-700 border-indigo-200',
  hot:           'bg-red-50 text-red-700 border-red-200',
  prospect:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  customer:      'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PREDEFINED_LABELS = [
  'New',
  'Chatting Replying',
  'No Reply',
  'Call Pending',
  'Call Done',
  'Interested',
  'Enrolled',
];

export default function QRLeadsPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const search = useSearch();
  const modal = useModal();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterWorkshop, setFilterWorkshop] = useState<string>('');
  const [metaOnly24h, setMetaOnly24h] = useState(false);  // Filter for Meta messages in 24h window
  const [workshops, setWorkshops] = useState<string[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [workshopCounts, setWorkshopCounts] = useState<Record<string, number>>({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [csvContacts, setCsvContacts] = useState<CSVContact[]>([]);
  const [csvColumnMap, setCsvColumnMap] = useState<CSVColumnMap | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvWorkshopOverride, setCsvWorkshopOverride] = useState('');
  const [csvSourceOverride, setCsvSourceOverride] = useState(QR_SOURCE);
  const [csvAssignAdmin, setCsvAssignAdmin] = useState('');
  const [adminUsersList, setAdminUsersList] = useState<Array<{ userId: string; name: string; email?: string; role?: string }>>([]);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkAssignedToUserId, setBulkAssignedToUserId] = useState<string>('');
  const [bulkWorkshopName, setBulkWorkshopName] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkLabels, setBulkLabels] = useState<string>('');
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const [backfillBusy, setBackfillBusy] = useState(false);

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [userOptions, setUserOptions] = useState<AdminUserOption[]>([]);

  const lastFetchTimeRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL_MS = 2000;
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) { setIsSuperAdmin(false); return; }
    try {
      const u = JSON.parse(userStr);
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setViewerUserId(u?.userId || '');
      setIsSuperAdmin(checkIsSuperAdmin());
    } catch { setIsSuperAdmin(false); }
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      if (!token || !isSuperAdmin) return;
      try {
        const response = await fetch('/api/admin/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const users = Array.isArray(data?.data) ? data.data : [];
        setUserOptions(
          users
            .map((x: any) => ({
              userId: String(x?.userId || '').trim(),
              name: x?.name ? String(x.name) : undefined,
              email: x?.email ? String(x.email) : undefined,
              permissions: Array.isArray(x?.permissions) ? x.permissions : undefined,
            }))
            .filter((u: AdminUserOption) => Boolean(u.userId))
        );
      } catch { /* ignore */ }
    };
    loadUsers();
  }, [token, isSuperAdmin]);

  // Fetch filter metadata (fast, no lead data)
  const fetchMetadata = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingMetadata(true);
      const params: Record<string, any> = {};
      if (isSuperAdmin && userFilter) params.userId = userFilter;
      const response = await fetch('/api/admin/crm/leads/metadata?' + new URLSearchParams(params), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStatusCounts(data.data.statusCounts || {});
        setWorkshops(data.data.workshops || []);
        setWorkshopCounts(data.data.workshopCounts || {});
        setTotal(data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    } finally {
      setLoadingMetadata(false);
    }
  }, [token, isSuperAdmin, userFilter]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!token) return;
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL_MS) return;
    lastFetchTimeRef.current = now;

    try {
      const params: Record<string, any> = { limit, skip };
      if (filterStatus) params.status = filterStatus;
      if (filterWorkshop) params.workshop = filterWorkshop;
      if (search.query) params.q = search.query;
      if (isSuperAdmin && userFilter) params.userId = userFilter;
      if (metaOnly24h) params.metaOnly24h = '1';  // Pass filter param

      const response = await fetch('/api/admin/crm/leads?' + new URLSearchParams(params), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLeads(data.data.leads || []);
        setTotal(data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch QR leads', err);
    }
  }, [token, limit, skip, filterStatus, filterWorkshop, search.query, isSuperAdmin, userFilter, metaOnly24h]);

  const handleCreateLead = async (values: LeadFormValues) => {
    try {
      const response = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phoneNumber: values.phoneNumber,
          source: QR_SOURCE,
          status: values.status,
          workshopName: values.workshopName,
          ...(isSuperAdmin && values.assignedToUserId ? { assignedToUserId: values.assignedToUserId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create lead');
      modal.close();
      form.resetForm();
      setSkip(0);
      fetchMetadata();
      fetchLeads();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
    }
  };

  const form = useForm<LeadFormValues>({
    initialValues: {
      name: '',
      email: '',
      phoneNumber: '',
      status: 'new_lead',
      workshopName: '',
      assignedToUserId: '',
    },
    onSubmit: handleCreateLead,
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    if (!token) return; // Wait for useAuth to resolve; it handles redirect.
    fetchMetadata();
  }, [token, fetchMetadata]);

  useEffect(() => {
    if (token) fetchLeads();
  }, [token, fetchLeads]);

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const response = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete lead');
      fetchMetadata();
      fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchMetadata();
      fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const downloadExcel = () => {
    if (leads.length === 0) { alert('No leads to download'); return; }
    const excelData = leads.map((lead) => ({
      'Lead ID': lead.leadNumber || '',
      User: getAssigneeLabel(lead.assignedToUserId) || '',
      Name: lead.name || '',
      Email: lead.email || '',
      'Phone Number': lead.phoneNumber,
      Status: lead.status,
      Source: lead.source,
      'Program/Workshop': lead.workshopName || '',
      Labels: lead.labels?.join(', ') || '',
      'Created Date': new Date(lead.createdAt).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QR Leads');
    ws['!cols'] = [
      { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
    ];
    const fileName = `qr_leads_${filterStatus || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getAssigneeLabel = (assignedToUserId?: string) => {
    const id = String(assignedToUserId || '').trim();
    if (!id) return '';
    const match = (userOptions || []).find((u: any) => String(u?.userId || '').trim() === id);
    if (!match) return id;
    return String(match?.name || match?.email || match?.userId || id);
  };

  const allSelectedOnPage = leads.length > 0 && leads.every((l) => selectedLeadIds.has(l._id));
  const someSelectedOnPage = leads.some((l) => selectedLeadIds.has(l._id));

  const toggleSelectAllOnPage = () => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        leads.forEach((l) => next.delete(l._id));
      } else {
        leads.forEach((l) => next.add(l._id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedLeadIds(new Set());

  const runBulkUpdate = async () => {
    if (!token) { setError('Please login again.'); return; }
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    if (!bulkAssignedToUserId.trim() && !bulkWorkshopName.trim() && !bulkStatus.trim() && !bulkLabels.trim()) {
      alert('Please set at least one field to update');
      return;
    }
    try {
      setBulkActionBusy(true);
      setError(null);
      const labelsArray = bulkLabels.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/admin/crm/leads/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          leadIds: ids,
          assignedToUserId: bulkAssignedToUserId.trim() || undefined,
          workshopName: bulkWorkshopName.trim() || undefined,
          status: bulkStatus || undefined,
          addLabels: labelsArray.length > 0 ? labelsArray : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Bulk update failed');
      alert(`Updated ${data?.data?.modifiedCount ?? 0} leads.`);
      setBulkAssignedToUserId('');
      setBulkWorkshopName('');
      setBulkStatus('');
      setBulkLabels('');
      clearSelection();
      fetchLeads();
      fetchMetadata();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setBulkActionBusy(false);
    }
  };

  if (!hasMounted) return null;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              QR WhatsApp Leads
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} leads from QR WhatsApp</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { fetchLeads(); fetchMetadata(); }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={downloadExcel}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
            {isSuperAdmin && (
              <button
                onClick={async () => {
                  if (!token) return;
                  try {
                    setBackfillBusy(true);
                    const res = await fetch('/api/admin/crm/leads/backfill-ids?limit=500', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.error || 'Backfill failed');
                    fetchMetadata();
                    fetchLeads();
                    alert(`Backfilled ${data?.data?.updated || 0} lead IDs. Remaining: ${data?.data?.remaining || 0}`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Backfill failed');
                  } finally {
                    setBackfillBusy(false);
                  }
                }}
                disabled={backfillBusy}
                className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-60"
              >
                {backfillBusy ? '⏳ Generating…' : '🧾 Generate IDs'}
              </button>
            )}
            <button
              onClick={() => {
                setBulkImportModalOpen(true);
                if (token && adminUsersList.length === 0) {
                  fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(d => {
                      if (d.success && d.users) {
                        setAdminUsersList(d.users.map((u: any) => ({ userId: u.userId || u._id, name: u.name || u.email || u.userId })));
                      }
                    })
                    .catch(() => {});
                }
              }}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Bulk Upload
            </button>
            <button
              onClick={modal.open}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* ── Status Filter Bar ── */}
      <div className="bg-white border-b px-6 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => { setFilterStatus(''); setSkip(0); }}
          className={`px-2.5 py-1 text-xs rounded-full font-medium border transition whitespace-nowrap ${!filterStatus ? 'bg-green-50 text-green-700 border-green-300 ring-1 ring-green-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
        >
          All <span className="text-[10px] ml-0.5 px-1 rounded-full bg-gray-100">{total}</span>
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

      {/* ── Filters ── */}
      <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search.query}
            onChange={e => { search.setQuery(e.target.value); setSkip(0); }}
            placeholder="Search by name, phone, email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          {search.query && (
            <button onClick={() => search.setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Workshop filter */}
        {workshops.length > 0 && (
          <select
            value={filterWorkshop}
            onChange={e => { setFilterWorkshop(e.target.value); setSkip(0); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">All Programs</option>
            {workshops.map(w => (
              <option key={w} value={w}>{w} ({workshopCounts[w] || 0})</option>
            ))}
          </select>
        )}

        {/* Admin user filter */}
        {isSuperAdmin && userOptions.length > 0 && (
          <select
            value={userFilter}
            onChange={e => { setUserFilter(e.target.value); setSkip(0); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">All Users</option>
            {userOptions.map(u => (
              <option key={u.userId} value={u.userId}>{u.name || u.email || u.userId}</option>
            ))}
          </select>
        )}

        {/* Page size */}
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setSkip(0); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>

        {/* Meta Only 24h filter toggle */}
        <button
          onClick={() => { setMetaOnly24h(!metaOnly24h); setSkip(0); }}
          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            metaOnly24h
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title="Show only leads with Meta messages in last 24 hours"
        >
          📱 Meta 24h
        </button>

        {selectedLeadIds.size > 0 && (
          <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">{selectedLeadIds.size} selected</span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-6 mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold text-lg">×</button>
        </div>
      )}

      {/* ── Bulk Actions Bar ── */}
      {selectedLeadIds.size > 0 && (
        <div className="mx-6 mb-3 bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-bold text-green-700">Selected: {selectedLeadIds.size}</div>
            <button onClick={clearSelection} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 font-medium">Clear</button>
            <button onClick={toggleSelectAllOnPage} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 font-medium">
              {allSelectedOnPage ? 'Deselect Page' : 'Select Page'}
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            {isSuperAdmin && (
              <select
                value={bulkAssignedToUserId}
                onChange={e => setBulkAssignedToUserId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Assign User</option>
                {userOptions.map(u => (
                  <option key={u.userId} value={u.userId}>{u.name || u.email || u.userId}</option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={bulkWorkshopName}
              onChange={e => setBulkWorkshopName(e.target.value)}
              placeholder="Program/Workshop"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            />
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Set Status</option>
              <option value="new_lead">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="demo_trial">Demo / Trial</option>
              <option value="negotiation">Negotiation</option>
              <option value="enrolled">Enrolled</option>
              <option value="completed">Completed</option>
              <option value="inactive">Inactive</option>
              <option value="repeater">Repeater</option>
              <option value="old_sadhak">Old Sadhak</option>
              <option value="only_for_post">Only for Post</option>
            </select>
            <input
              type="text"
              value={bulkLabels}
              onChange={e => setBulkLabels(e.target.value)}
              placeholder="Add labels (comma sep)"
              list="qr-bulk-labels"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            />
            <datalist id="qr-bulk-labels">
              {PREDEFINED_LABELS.map(l => <option key={l} value={l} />)}
            </datalist>
            <button
              onClick={runBulkUpdate}
              disabled={bulkActionBusy}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {bulkActionBusy ? 'Updating…' : 'Apply'}
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left w-8">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      ref={el => { if (el) el.indeterminate = !allSelectedOnPage && someSelectedOnPage; }}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4 accent-green-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">#</th>
                  {isSuperAdmin && <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">User</th>}
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Phone</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Labels</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Workshop</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Created</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {crm.loading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 10 : 9} className="text-center py-12">
                      <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" />
                      <p className="mt-2 text-xs text-gray-400">Loading leads...</p>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 10 : 9} className="text-center py-12 text-gray-400 text-sm">
                      {search.query || filterStatus ? 'No leads match your filters' : 'No QR WhatsApp leads found. Add one or use Bulk Upload.'}
                    </td>
                  </tr>
                ) : (
                  leads.map((lead, i) => (
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
                          className="h-4 w-4 accent-green-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs font-mono">{lead.leadNumber || skip + i + 1}</td>
                      {isSuperAdmin && (
                        <td className="px-3 py-2">
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {getAssigneeLabel(lead.assignedToUserId) || 'Unassigned'}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setSelectedLeadId(lead._id)}
                          className="text-left hover:text-green-700 font-medium text-gray-900"
                        >
                          {(!lead.name || lead.name === 'Unknown' || lead.name === 'N/A' || lead.name === 'QR Lead' || String(lead.name).startsWith('QR Lead '))
                            ? lead.phoneNumber
                            : lead.name}
                        </button>
                        {lead.email && <p className="text-xs text-gray-400 mt-0.5">{lead.email}</p>}
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-mono text-xs">{lead.phoneNumber}</td>
                      <td className="px-3 py-2">
                        <select
                          value={lead.status || 'new_lead'}
                          onChange={e => handleStatusChange(lead._id, e.target.value)}
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border cursor-pointer ${STATUS_COLORS[lead.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}
                        >
                          <option value="new_lead">New Lead</option>
                          <option value="contacted">Contacted</option>
                          <option value="interested">Interested</option>
                          <option value="demo_trial">Demo / Trial</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="enrolled">Enrolled</option>
                          <option value="completed">Completed</option>
                          <option value="inactive">Inactive</option>
                          <option value="repeater">Repeater</option>
                          <option value="old_sadhak">Old Sadhak</option>
                          <option value="only_for_post">Only for Post</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(lead.labels || []).slice(0, 3).map(l => (
                            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">{l}</span>
                          ))}
                          {(lead.labels || []).length > 3 && (
                            <span className="text-[10px] text-gray-400">+{lead.labels.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{lead.workshopName || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedLeadId(lead._id)} className="p-1 rounded hover:bg-green-50" title="View">
                            <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                          </button>
                          <a href={`tel:${lead.phoneNumber || ''}`} className="p-1 rounded hover:bg-green-50" title="Call">
                            <PhoneCall className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                          </a>
                          <a href={`sms:${lead.phoneNumber || ''}`} className="p-1 rounded hover:bg-cyan-50" title="SMS">
                            <MessageSquare className="w-3.5 h-3.5 text-gray-400 hover:text-cyan-600" />
                          </a>
                          <a href={`mailto:${lead.email || ''}`} className="p-1 rounded hover:bg-indigo-50" title="Email">
                            <Mail className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600" />
                          </a>
                          <button onClick={() => handleDeleteLead(lead._id)} className="p-1 rounded hover:bg-red-50" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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

      {/* ── Lead Detail Modal ── */}
      {selectedLeadId && token && (
        <LeadDetailModal
          leadId={selectedLeadId}
          token={token}
          onClose={() => { setSelectedLeadId(null); fetchLeads(); }}
        />
      )}

      {/* ── Create Lead Modal ── */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add QR Lead</h2>
              <button onClick={modal.close} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={form.handleSubmit} className="space-y-3">
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Admin</label>
                  <select name="assignedToUserId" value={form.values.assignedToUserId || ''} onChange={form.handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">(Current admin)</option>
                    {userOptions.map(u => <option key={u.userId} value={u.userId}>{u.name || u.email || u.userId}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required name="name" value={form.values.name} onChange={form.handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Lead name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={form.values.email} onChange={form.handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel" required name="phoneNumber" value={form.values.phoneNumber} onChange={form.handleChange}
                  onBlur={e => { const n = normalizePhoneForMeta(e.target.value); if (n) form.setFieldValue('phoneNumber', n); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="+919876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={form.values.status} onChange={form.handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="new_lead">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="demo_trial">Demo / Trial</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workshop/Program</label>
                <input type="text" name="workshopName" value={form.values.workshopName || ''} onChange={form.handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Yoga Retreat 2026" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition">Create Lead</button>
                <button type="button" onClick={() => { modal.close(); form.resetForm(); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Import Modal ── */}
      {bulkImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">📄 Bulk Import QR Leads</h2>
              <button
                onClick={() => { setBulkImportModalOpen(false); setCsvContacts([]); setCsvColumnMap(null); setCsvFileName(''); setCsvWorkshopOverride(''); setCsvSourceOverride(QR_SOURCE); setCsvAssignAdmin(''); }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >×</button>
            </div>

            {/* Template Download */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-700">📥 Need a sample format?</p>
                  <p className="text-xs text-indigo-500">Download demo Excel template with required columns</p>
                </div>
                <button
                  onClick={() => {
                    const demoData = [
                      { Name: 'Rahul Sharma', 'Phone Number': '9876543210', Email: 'rahul@example.com', Status: 'lead', Source: QR_SOURCE, 'Workshop Name': 'Swar Vidnyan Feb 2026', Address: 'Mumbai', Labels: 'New, Interested' },
                      { Name: 'Priya Patel', 'Phone Number': '9123456789', Email: 'priya@example.com', Status: 'prospect', Source: QR_SOURCE, 'Workshop Name': 'Swar Vidnyan Feb 2026', Address: 'Pune', Labels: 'Call Pending' },
                      { Name: 'Amit Kumar', 'Phone Number': '9988776655', Email: 'amit@example.com', Status: 'lead', Source: QR_SOURCE, 'Workshop Name': '', Address: 'Delhi', Labels: '' },
                    ];
                    const ws = XLSX.utils.json_to_sheet(demoData);
                    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 20 }];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'QR Leads');
                    XLSX.writeFile(wb, 'qr_leads_import_template.xlsx');
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                >
                  ⬇️ Download Template
                </button>
              </div>
              <div className="mt-2 text-xs text-indigo-500 space-y-0.5">
                <p><strong className="text-indigo-700">Required:</strong> Phone Number</p>
                <p><strong className="text-indigo-700">Optional:</strong> Name, Email, Status, Source, Workshop Name, Address, Labels</p>
              </div>
            </div>

            <CSVUploadPanel
              previewColumns={['name', 'phone', 'email', 'status', 'source', 'workshop']}
              contacts={csvContacts}
              fileName={csvFileName}
              columnMap={csvColumnMap}
              accent="teal"
              label="Upload CSV or Excel — Auto-detect Name, Phone, Email, Status, Source, Workshop"
              onContactsParsed={(contacts, colMap, name) => {
                setCsvContacts(contacts);
                setCsvColumnMap(colMap);
                setCsvFileName(name);
                if (colMap?.workshop) {
                  const first = contacts.find(c => c.raw[colMap.workshop!]?.trim());
                  setCsvWorkshopOverride(first ? first.raw[colMap.workshop!].trim() : '');
                } else {
                  setCsvWorkshopOverride('');
                }
              }}
              onRemove={() => { setCsvContacts([]); setCsvColumnMap(null); setCsvFileName(''); setCsvWorkshopOverride(''); setCsvSourceOverride(QR_SOURCE); setCsvAssignAdmin(''); }}
            />

            {csvContacts.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-green-700 block mb-1">Workshop Name (applies to all)</label>
                  <input type="text" value={csvWorkshopOverride} onChange={e => setCsvWorkshopOverride(e.target.value)} placeholder="e.g. Swar Vidnyan Feb 2026" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-green-700 block mb-1">👤 Assign to Admin</label>
                  <select value={csvAssignAdmin} onChange={e => setCsvAssignAdmin(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                    <option value="">— Current logged-in user (default) —</option>
                    {adminUsersList.length === 0 ? (
                      <option disabled>Loading admin users...</option>
                    ) : (
                      adminUsersList.map(u => (
                        <option key={u.userId} value={u.userId}>{u.name} {u.role ? `(${u.role})` : ''} • {u.email}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-green-700 block mb-1">Source (applies to all)</label>
                  <input type="text" value={csvSourceOverride} onChange={e => setCsvSourceOverride(e.target.value)} placeholder="qr_whatsapp" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                </div>
                <p className="text-green-800 text-sm font-bold pt-1">Ready to import {csvContacts.length} contacts as QR leads</p>
                <p className="text-gray-500 text-xs">Duplicate phone numbers will be skipped. Missing fields will be filled later.</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                disabled={csvContacts.length === 0 || csvImporting}
                onClick={async () => {
                  if (!token || csvContacts.length === 0) return;
                  setCsvImporting(true);
                  try {
                    const payload = csvContacts.map(c => {
                      const row: any = { phoneNumber: c.phoneNumber };
                      if (c.name) row.name = c.name;
                      if (c.email) row.email = c.email;
                      if (csvColumnMap?.status) {
                        const v = c.raw[csvColumnMap.status]?.trim();
                        if (v) row.status = v;
                      }
                      row.source = csvSourceOverride.trim() || QR_SOURCE;
                      if (csvWorkshopOverride.trim()) {
                        row.workshopName = csvWorkshopOverride.trim();
                      } else if (csvColumnMap?.workshop) {
                        const v = c.raw[csvColumnMap.workshop]?.trim();
                        if (v) row.workshopName = v;
                      }
                      if (csvColumnMap?.address) {
                        const v = c.raw[csvColumnMap.address]?.trim();
                        if (v) row.address = v;
                      }
                      if (csvColumnMap?.labels) {
                        const v = c.raw[csvColumnMap.labels]?.trim();
                        if (v) row.labels = v.split(/[,|]+/).map((l: string) => l.trim()).filter(Boolean);
                      }
                      return row;
                    });

                    const res = await fetch('/api/admin/crm/leads/bulk-import', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contacts: payload,
                        ...(csvAssignAdmin ? { assignedToUserId: csvAssignAdmin } : {}),
                      }),
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                      let msg = `✅ Imported ${data.data.imported} new QR leads!`;
                      if (data.data.duplicates > 0) msg += `\n📋 ${data.data.duplicates} already exist (skipped)`;
                      if (data.data.skipped > 0) msg += `\n⚠️ ${data.data.skipped} invalid (phone errors)`;
                      if (data.data.failed > 0) msg += `\n❌ ${data.data.failed} failed`;
                      alert(msg);
                      setBulkImportModalOpen(false);
                      setCsvContacts([]);
                      setCsvColumnMap(null);
                      setCsvFileName('');
                      setCsvWorkshopOverride('');
                      setCsvSourceOverride(QR_SOURCE);
                      setCsvAssignAdmin('');
                      fetchMetadata();
                      fetchLeads();
                    } else {
                      alert(`Error: ${data.error || 'Import failed'}`);
                    }
                  } catch (err) {
                    alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  } finally {
                    setCsvImporting(false);
                  }
                }}
                className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {csvImporting ? '⏳ Importing...' : `Import ${csvContacts.length} QR Leads`}
              </button>
              <button
                onClick={() => { setBulkImportModalOpen(false); setCsvContacts([]); setCsvColumnMap(null); setCsvFileName(''); setCsvWorkshopOverride(''); setCsvSourceOverride(QR_SOURCE); setCsvAssignAdmin(''); }}
                disabled={csvImporting}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
