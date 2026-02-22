'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { useSearch } from '@/hooks/useSearch';
import { useModal } from '@/hooks/useModal';
import { useForm } from '@/hooks/useForm';
import * as XLSX from 'xlsx';
import { normalizePhoneForMeta } from '@/lib/utils/phone';
import CSVUploadPanel from '@/components/admin/crm/CSVUploadPanel';
import type { CSVContact, CSVColumnMap } from '@/components/admin/crm/CSVUploadPanel';
import {
  DataTable,
  FormModal,
  StatusBadge,
  Toolbar,
  PageHeader,
  LoadingSpinner,
  AlertBox,
  AddToBroadcastModal,
} from '@/components/admin/crm';

interface Lead {
  _id: string;
  leadNumber?: string;
  assignedToUserId?: string;
  createdByUserId?: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: 'lead' | 'hot' | 'prospect' | 'customer' | 'inactive';
  source: string;
  labels: string[];
  workshopId?: string;
  workshopName?: string;
  createdAt: string;
}

type LeadFormValues = {
  name: string;
  email: string;
  phoneNumber: string;
  source: Lead['source'] | string;
  status: Lead['status'];
  workshopName?: string;
  assignedToUserId?: string;
};

type AdminUserOption = {
  userId: string;
  name?: string;
  email?: string;
  permissions?: string[];
};

export default function LeadsPage() {
  const router = useRouter();
  const token = useAuth();

  const enableMetaWhatsApp = (process.env.NEXT_PUBLIC_ENABLE_META_WHATSAPP || '').toLowerCase() === 'true';
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
  const [csvSourceOverride, setCsvSourceOverride] = useState('');
  const [csvAssignAdmin, setCsvAssignAdmin] = useState('');
  const [adminUsersList, setAdminUsersList] = useState<Array<{ userId: string; name: string; email?: string; role?: string }>>([]);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<any>(null);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  // Determine if bulk actions should be visible
  const bulkActionsVisible = selectedLeadIds.size >= 1;
  const [bulkAssignedToUserId, setBulkAssignedToUserId] = useState<string>('');
  const [bulkWorkshopName, setBulkWorkshopName] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkLabels, setBulkLabels] = useState<string>('');
  const [bulkActionBusy, setBulkActionBusy] = useState(false);

  const [backfillBusy, setBackfillBusy] = useState(false);

  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [leadsForBroadcast, setLeadsForBroadcast] = useState<Lead[]>([]);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [userOptions, setUserOptions] = useState<AdminUserOption[]>([]);

  // User requested labels
  const PREDEFINED_LABELS = [
    'New', 
    'Chatting Replying', 
    'No Reply', 
    'Call Pending', 
    'Call Done', 
    'Interested', 
    'Enrolled'
  ];

  // Track last fetch to prevent rapid retries on errors
  const lastFetchTimeRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL_MS = 2000; // Minimum 2 second interval between fetch attempts

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    // Determine if current admin has full access (admin / permissions: ['all'])
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) {
      setIsSuperAdmin(false);
      return;
    }
    try {
      const u = JSON.parse(userStr);
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setViewerUserId(u?.userId || '');
      setIsSuperAdmin((u?.userId === 'admin' || u?.userId === 'admincrm') || perms.includes('all'));
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  useEffect(() => {
    // For super-admin, fetch user list so admin can filter by user and assign leads.
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
      } catch {
        // ignore
      }
    };
    loadUsers();
  }, [token, isSuperAdmin]);

  // Fetch only filter metadata (fast, no lead data)
  const fetchMetadata = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingMetadata(true);
      const params: Record<string, any> = {};
      if (isSuperAdmin && userFilter) params.userId = userFilter;
      const response = await fetch('/api/admin/crm/leads/metadata' + (Object.keys(params).length ? `?${new URLSearchParams(params)}` : ''), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStatusCounts(data.data.statusCounts);
        setWorkshops(data.data.workshops);
        setWorkshopCounts(data.data.workshopCounts);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    } finally {
      setLoadingMetadata(false);
    }
  }, [token, isSuperAdmin, userFilter]);

  // Fetch only current page of leads
  const fetchLeads = useCallback(async () => {
    if (!token) return;

    // Throttle: prevent rapid retries when there are errors
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL_MS) {
      return;
    }
    lastFetchTimeRef.current = now;

    try {
      const params: Record<string, any> = { limit, skip };
      if (filterStatus) params.status = filterStatus;
      if (filterWorkshop) params.workshop = filterWorkshop;
      if (search.query) params.q = search.query;
      if (isSuperAdmin && userFilter) params.userId = userFilter;

      const response = await fetch(
        '/api/admin/crm/leads?' + new URLSearchParams(params),
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setLeads(data.data.leads || []);
        setTotal(data.data.total || 0);
      } else {
        // Log error response for debugging
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error(`Failed to fetch leads (${response.status}):`, errorData);
        // Only retry on certain status codes (not 400/401/403)
        if (response.status >= 500) {
          console.warn('Server error (5xx) - data may be temporarily unavailable');
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads', err);
    }
  }, [token, limit, skip, filterStatus, filterWorkshop, search.query, isSuperAdmin, userFilter]);

  const handleCreateLead = async (values: LeadFormValues) => {
    try {
      const response = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phoneNumber: values.phoneNumber,
          source: values.source,
          status: values.status,
          workshopName: values.workshopName,
          ...(isSuperAdmin && values.assignedToUserId ? { assignedToUserId: values.assignedToUserId } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a duplicate error
        if (response.status === 409 && data.duplicate) {
          setDuplicateLead(data.existingLead);
          setDuplicateModalOpen(true);
          return;
        }
        throw new Error(data.error || 'Failed to create lead');
      }

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
      source: 'website',
      status: 'lead',
      workshopName: '',
      assignedToUserId: '',
    },
    onSubmit: handleCreateLead,
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchMetadata();
  }, [token, router, fetchMetadata]);

  useEffect(() => {
    if (token) {
      fetchLeads();
    }
  }, [token, fetchLeads]);

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const response = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
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
          'Authorization': `Bearer ${token}`,
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
    if (leads.length === 0) {
      alert('No leads to download');
      return;
    }

    // Prepare data
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

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    // Auto-size columns
    const colWidths = [
      { wch: 10 },
      { wch: 18 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    // Download
    const fileName = `leads_${filterStatus || 'all'}_${filterWorkshop || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  type LeadColumn = {
    key: string;
    label: string;
    render?: (value: any, lead: Lead) => ReactNode;
  };

  const getAssigneeLabel = (assignedToUserId?: string) => {
    const id = String(assignedToUserId || '').trim();
    if (!id) return '';
    const match = (userOptions || []).find((u: any) => String(u?.userId || '').trim() === id);
    if (!match) return id;
    return String(match?.name || match?.email || match?.userId || id);
  };

  const columns: LeadColumn[] = [
    {
      key: '_select',
      label: 'Select',
      render: (_: any, lead: Lead) => {
        const checked = selectedLeadIds.has(lead._id);
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                e.stopPropagation();
                setSelectedLeadIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(lead._id)) next.delete(lead._id);
                  else next.add(lead._id);
                  return next;
                });
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 accent-green-500 cursor-pointer"
              aria-label={`Select lead ${lead.leadNumber || lead._id}`}
            />
          </div>
        );
      },
    },
    {
      key: 'leadNumber',
      label: 'Lead ID',
      render: (val: any) => (
        <div className="border border-white/20 rounded-xl px-3 py-2 bg-white/5 text-center">
          <div className="text-xs font-bold text-green-400 mb-1">LEAD ID</div>
          <div className="font-mono font-bold text-white">{val || '-'}</div>
        </div>
      ),
    },
    {
      key: 'assignedToUserId',
      label: 'User',
      render: (val: any) => (
        <div className="bg-blue-600/80 text-white rounded-xl px-3 py-2 text-center font-semibold shadow-lg shadow-blue-500/20">
          {getAssigneeLabel(val) || 'Unassigned'}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name & Contact',
      render: (name: any, lead: Lead) => (
        <div className="space-y-1">
          <div className="font-semibold text-white break-words">{String(name || 'N/A')}</div>
          <div className="text-xs text-gray-400 break-words">{lead.email || 'N/A'}</div>
        </div>
      ),
    },
    { key: 'phoneNumber', label: 'Phone' },
    {
      key: 'labels',
      label: 'Labels',
      render: (labels: any) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(labels) && labels.length > 0 ? (
            labels.map((label: any) => (
              <span
                key={String(label)}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30"
              >
                {String(label)}
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: any, lead: Lead) => (
        <select
          value={String(status || 'lead')}
          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
          className="px-3 py-1.5 bg-green-500/90 border border-green-400/50 rounded-full text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer hover:bg-green-400 transition-all duration-300 shadow-lg shadow-green-500/20"
        >
          <option value="lead" className="bg-[#1a1a1a] text-white">Lead</option>
          <option value="hot" className="bg-[#1a1a1a] text-white">🔥 Hot</option>
          <option value="prospect" className="bg-[#1a1a1a] text-white">Prospect</option>
          <option value="customer" className="bg-[#1a1a1a] text-white">Customer</option>
          <option value="inactive" className="bg-[#1a1a1a] text-white">Inactive</option>
        </select>
      ),
    },
    { key: 'source', label: 'Source' },
    { key: 'workshopName', label: 'Program/Workshop' },
    {
      key: 'createdAt',
      label: 'Created',
      render: (date: any) => {
        const d = new Date(String(date || ''));
        return <span className="text-gray-400">{Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()}</span>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, lead: Lead) => {
        // Check if current user can message this lead
        const canMessage = isSuperAdmin || 
          !lead.assignedToUserId || 
          lead.assignedToUserId === viewerUserId ||
          lead.assignedToUserId === '';
        
        return (
        <div className="flex gap-2 items-center relative">
          <button
            onClick={() => router.push(`/admin/crm/leads/${lead._id}`)}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-all duration-300 border border-white/20 hover:border-white/40"
            title="View lead details"
          >
            View
          </button>

          {canMessage ? (
            <button
              onClick={() => {
                const phone = (lead.phoneNumber || '').replace(/\D/g, '');
                router.push(`/admin/crm/meta?phone=${encodeURIComponent(phone)}`);
              }}
              className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-1 shadow-lg shadow-green-500/20"
              title="Open in Meta Inbox"
            >
              <span aria-hidden>💬</span>
              WhatsApp
            </button>
          ) : (
            <button
              disabled
              className="px-3 py-1.5 bg-gray-800/50 text-gray-500 rounded-xl text-sm font-medium cursor-not-allowed flex items-center gap-1 border border-gray-700/50"
              title="This lead is assigned to another user"
            >
              <span aria-hidden>🔒</span>
              WhatsApp
            </button>
          )}

          <button
            onClick={() => router.push(`/admin/crm/leads-followup?leadId=${encodeURIComponent(lead._id)}`)}
            className="px-3 py-1.5 bg-orange-500/90 hover:bg-orange-500 text-black rounded-xl text-sm font-bold transition-all duration-300 shadow-lg shadow-orange-500/20"
            title="Open lead followup"
          >
            Followup
          </button>

          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (filterStatus) params.set('status', filterStatus);
              if (filterWorkshop) params.set('workshop', filterWorkshop);
              if (isSuperAdmin && userFilter) params.set('userId', userFilter);
              // Hint: keep the same lead highlighted by selecting just this lead.
              params.set('leadId', lead._id);
              router.push(`/admin/crm/broadcast?${params.toString()}`);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all duration-300 shadow-lg shadow-blue-500/20"
            title="Open Broadcast with current filters"
          >
            📢 Broadcast
          </button>

          <button
            onClick={() => handleDeleteLead(lead._id)}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-all duration-300 border border-red-500/30 hover:border-red-500/50"
            title="Delete lead"
          >
            Delete
          </button>
        </div>
      );
      },
    },
  ];

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
    if (!token) {
      setError('Please login again.');
      return;
    }
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;

    if (!bulkAssignedToUserId.trim() && !bulkWorkshopName.trim() && !bulkStatus.trim() && !bulkLabels.trim()) {
      alert('Please set at least one field to update (User, Program/Workshop, Status, Labels)');
      return;
    }

    try {
      setBulkActionBusy(true);
      setError(null);
      
      const labelsArray = bulkLabels.split(',').map(s => s.trim()).filter(Boolean);

      const res = await fetch('/api/admin/crm/leads/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a] flex p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-full space-y-6">
        {/* Page Header - Dark Theme */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/crm')}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg transition-all duration-300 text-white hover:text-green-400 hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/10"
                title="Go to CRM Dashboard"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Lead Management</h1>
                <p className="text-gray-400 text-base md:text-lg">Manage and track all customer leads efficiently</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <button
              onClick={() => router.push('/admin/crm/leads/deleted')}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold border border-red-500/30 hover:border-red-500/60 flex items-center gap-2 hover:shadow-lg hover:shadow-red-500/10"
            >
              🗑️ Deleted
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
                className="bg-orange-500/90 hover:bg-orange-500 text-black px-4 py-2.5 rounded-xl transition-all duration-300 disabled:opacity-60 font-bold border border-orange-400/50 hover:shadow-lg hover:shadow-orange-500/20"
              >
                {backfillBusy ? '⏳ Generating…' : '🧾 Generate IDs'}
              </button>
            )}
            <button
              onClick={() => {
                setBulkImportModalOpen(true);
                // Fetch admin users for assignment dropdown
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
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold border border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20"
            >
              📤 Bulk Upload
            </button>
            <button
              onClick={() => {
                // Build query params with current filters
                const params = new URLSearchParams();
                if (filterStatus) params.set('status', filterStatus);
                if (filterWorkshop) params.set('workshop', filterWorkshop);
                if (userFilter) params.set('userId', userFilter);
                
                // Navigate to broadcast page with filters preserved
                const queryString = params.toString();
                router.push(`/admin/crm/broadcast${queryString ? `?${queryString}` : ''}`);
              }}
              className="bg-orange-500/90 hover:bg-orange-500 text-black px-4 py-2.5 rounded-xl transition-all duration-300 font-bold border border-orange-400/50 flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/20"
              title="Go to broadcast page with current filters applied"
            >
              📢 To Broadcast
            </button>
            <button
              onClick={modal.open}
              className="bg-green-500 hover:bg-green-400 text-white px-6 py-2.5 rounded-xl transition-all duration-300 font-bold shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 border border-green-400/50"
            >
              + Add Lead
            </button>
          </div>
        </div>

        {/* Filters Section - Dark Glass Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-6">Filters & Search</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status Filter */}
            <div>
              <label htmlFor="filter-status" className="block text-white text-sm font-semibold mb-3">Status</label>
              <select
                id="filter-status"
                name="status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all hover:border-white/40"
              >
                <option value="" className="bg-[#1a1a1a] text-white">All Status ({total})</option>
                <option value="lead" className="bg-[#1a1a1a] text-white">Lead ({statusCounts.lead || 0})</option>
                <option value="hot" className="bg-[#1a1a1a] text-white">🔥 Hot ({statusCounts.hot || 0})</option>
                <option value="prospect" className="bg-[#1a1a1a] text-white">Prospect ({statusCounts.prospect || 0})</option>
                <option value="customer" className="bg-[#1a1a1a] text-white">Customer ({statusCounts.customer || 0})</option>
                <option value="inactive" className="bg-[#1a1a1a] text-white">Inactive ({statusCounts.inactive || 0})</option>
              </select>
            </div>

            {/* Workshop Filter */}
            <div>
              <label htmlFor="filter-workshop" className="block text-white text-sm font-semibold mb-3">Program/Workshop</label>
              <select
                id="filter-workshop"
                name="workshop"
                value={filterWorkshop}
                onChange={(e) => {
                  setFilterWorkshop(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all hover:border-white/40"
              >
                <option value="" className="bg-[#1a1a1a] text-white">All Programs</option>
                {workshops.map((workshop) => (
                  <option key={workshop} value={workshop} className="bg-[#1a1a1a] text-white">
                    {workshop} ({workshopCounts[workshop] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            {isSuperAdmin && (
              <div>
                <label htmlFor="filter-user" className="block text-white text-sm font-semibold mb-3">Admin User</label>
                <select
                  id="filter-user"
                  name="user"
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value);
                    setSkip(0);
                  }}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all hover:border-white/40"
                >
                  <option value="" className="bg-[#1a1a1a] text-white">All Users</option>
                  {userOptions.map((u) => (
                    <option key={u.userId} value={u.userId} className="bg-[#1a1a1a] text-white">
                      {u.name || u.email || u.userId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Box */}
            <div>
              <label htmlFor="search-input" className="block text-white text-sm font-semibold mb-3">Search</label>
              <input
                id="search-input"
                name="search"
                type="text"
                placeholder="Name, email, phone..."
                value={search.query}
                onChange={(e) => {
                  search.setQuery(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white font-medium placeholder-gray-500 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all hover:border-white/40"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex justify-between items-center backdrop-blur-sm">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold text-xl transition-colors">×</button>
          </div>
        )}

        {/* Loading State */}
        {crm.loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full animate-spin">
                <div className="w-10 h-10 bg-[#0a0a0a] rounded-full"></div>
              </div>
              <p className="text-gray-400 font-medium">Loading leads...</p>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center shadow-2xl">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">No leads found</h3>
            <p className="text-gray-400 mb-6">Start by adding a new lead or uploading from a file</p>
            <button
              onClick={modal.open}
              className="bg-green-500 hover:bg-green-400 text-white px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30"
            >
              + Add Your First Lead
            </button>
          </div>
        ) : (
          <>
            {/* Bulk Actions Bar */}
            {selectedLeadIds.size > 0 && (
              <div className="bg-green-500/10 backdrop-blur-xl border border-green-500/30 rounded-2xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="font-bold text-green-400">
                    Selected: {selectedLeadIds.size}
                  </div>

                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 bg-white/5 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/10 hover:border-white/40 transition-all duration-300"
                  >
                    Clear
                  </button>
                  
                  <button
                    onClick={() => {
                      const selectedLeads = leads.filter((l) => selectedLeadIds.has(l._id));
                      setLeadsForBroadcast(selectedLeads);
                      setBroadcastModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-xl font-semibold hover:bg-orange-500/30 transition-all duration-300 flex items-center gap-1"
                  >
                    📢 Add to Broadcast
                  </button>

                  <button
                    onClick={() => toggleSelectAllOnPage()}
                    className="px-3 py-1.5 bg-white/5 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/10 hover:border-white/40 transition-all duration-300"
                    title="Select/deselect all on this page"
                  >
                    Actions All
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  {isSuperAdmin && (
                    <select
                      value={bulkAssignedToUserId}
                      onChange={(e) => setBulkAssignedToUserId(e.target.value)}
                      className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:border-green-400 transition-all"
                    >
                      <option value="" className="bg-[#1a1a1a]">Assign User (optional)</option>
                      {userOptions.map((u) => (
                        <option key={u.userId} value={u.userId} className="bg-[#1a1a1a]">
                          {u.name || u.email || u.userId}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    value={bulkWorkshopName}
                    onChange={(e) => setBulkWorkshopName(e.target.value)}
                    placeholder="Set Program/Workshop (optional)"
                    className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold placeholder-gray-500 focus:border-green-400 transition-all"
                  />

                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:border-green-400 transition-all"
                  >
                    <option value="" className="bg-[#1a1a1a]">Set Status (optional)</option>
                    <option value="lead" className="bg-[#1a1a1a]">Lead</option>
                    <option value="hot" className="bg-[#1a1a1a]">🔥 Hot</option>
                    <option value="prospect" className="bg-[#1a1a1a]">Prospect</option>
                    <option value="customer" className="bg-[#1a1a1a]">Customer</option>
                    <option value="inactive" className="bg-[#1a1a1a]">Inactive</option>
                  </select>

                  <input
                    type="text"
                    value={bulkLabels}
                    onChange={(e) => setBulkLabels(e.target.value)}
                    placeholder="Add labels (select or type)"
                    list="bulk-labels-list"
                    className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold placeholder-gray-500 focus:border-green-400 transition-all"
                  />
                  <datalist id="bulk-labels-list">
                    {PREDEFINED_LABELS.map(label => (
                        <option key={label} value={label} />
                    ))}
                  </datalist>

                  <button
                    onClick={runBulkUpdate}
                    disabled={bulkActionBusy}
                    className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold disabled:opacity-60 transition-all duration-300 shadow-lg shadow-green-500/20"
                  >
                    {bulkActionBusy ? 'Updating…' : 'Apply Bulk Update'}
                  </button>
                </div>
              </div>
            )}

            {/* Data Table - Dark Glass Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-visible">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/10">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-6 py-4 text-left text-sm font-bold text-green-400 uppercase tracking-wider"
                        >
                          {col.key === '_select' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={allSelectedOnPage}
                                ref={(el) => {
                                  if (el) el.indeterminate = !allSelectedOnPage && someSelectedOnPage;
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelectAllOnPage();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 accent-green-500 cursor-pointer"
                                aria-label="Select all leads on this page"
                              />
                              <span className="text-xs text-gray-400">All</span>
                            </div>
                          ) : (
                            col.label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, idx) => (
                      <tr
                        key={lead._id}
                        className={`border-b border-white/5 transition-all duration-200 ${
                          idx % 2 === 0 ? 'bg-white/[0.02] hover:bg-white/10' : 'bg-white/[0.04] hover:bg-white/10'
                        }`}
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="px-6 py-4 text-sm text-white">
                            {col.render ? col.render((lead as any)[col.key], lead) : (lead as any)[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination - Dark Glass */}
            {leads.length > 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-gray-400 font-medium">
                    Showing <span className="font-bold text-white">{skip + 1}</span> to{' '}
                    <span className="font-bold text-white">{Math.min(skip + limit, total)}</span> of{' '}
                    <span className="font-bold text-green-400">{total}</span> leads
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">Show:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value);
                        setLimit(newLimit);
                        setSkip(0);
                      }}
                      className="bg-white/5 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-400 transition-all"
                    >
                      <option value={20} className="bg-[#1a1a1a]">20</option>
                      <option value={50} className="bg-[#1a1a1a]">50</option>
                      <option value={100} className="bg-[#1a1a1a]">100</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                    disabled={skip === 0}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300 border border-white/20 hover:border-white/40"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center px-4 text-gray-400 font-medium">
                    Page {Math.floor(skip / limit) + 1} of {Math.max(1, Math.ceil(total / limit))}
                  </div>
                  <button
                    onClick={() => {
                      if (skip + limit < total) setSkip(skip + limit);
                    }}
                    disabled={skip + limit >= total}
                    className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-green-500/20"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Lead Modal */}
      {modal.isOpen && (
        <FormModal
          isOpen={true}
          onClose={modal.close}
          onSubmit={form.handleSubmit}
          title="Create New Lead"
          submitLabel="Create Lead"
          cancelLabel="Cancel"
        >
          <div className="space-y-4">
            {/* Admin User Assignment - visible to all admins */}
            <div>
              <label className="block text-[#0f3a4d] text-sm mb-2 font-semibold">Assign to Admin User (Optional)</label>
              <select
                name="assignedToUserId"
                value={form.values.assignedToUserId || ''}
                onChange={form.handleChange}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2 text-[#0f3a4d] focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645]"
              >
                <option value="">(Default: current admin)</option>
                {isSuperAdmin && userOptions.length > 0 ? (
                  userOptions.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name || u.email || u.userId}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading users...</option>
                )}
              </select>
              <p className="text-[#0f3a4d]/70 text-xs mt-1">This controls which admin user can see/manage this lead.</p>
            </div>
            <div>
              <label className="block text-[#0f3a4d] text-sm mb-2 font-semibold">Name *</label>
              <input
                type="text"
                required
                name="name"
                value={form.values.name}
                onChange={form.handleChange}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2 text-[#0f3a4d] placeholder-[#0f3a4d]/50 focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645]"
                placeholder="Lead name"
              />
            </div>
            <div>
              <label className="block text-[#0f3a4d] text-sm mb-2 font-semibold">Email *</label>
              <input
                type="email"
                required
                name="email"
                value={form.values.email}
                onChange={form.handleChange}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2 text-[#0f3a4d] placeholder-[#0f3a4d]/50 focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645]"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-[#0f3a4d] text-sm mb-2 font-semibold">Phone Number *</label>
              <input
                type="tel"
                required
                name="phoneNumber"
                value={form.values.phoneNumber}
                onChange={form.handleChange}
                onBlur={(e) => {
                  const normalized = normalizePhoneForMeta(e.target.value);
                  if (normalized) form.setFieldValue('phoneNumber', normalized);
                }}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2 text-[#0f3a4d] placeholder-[#0f3a4d]/50 focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645]"
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label className="block text-[#0f3a4d] text-sm mb-2 font-semibold">Source</label>
              <select
                name="source"
                value={form.values.source}
                onChange={form.handleChange}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2 text-[#0f3a4d] focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645]"
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <label className="block text-[#0f3a4d] text-sm mb-2 font-semibold">Status</label>
              <select
                name="status"
                value={form.values.status}
                onChange={form.handleChange}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2 text-[#0f3a4d] focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645]"
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-[#0f3a4d] text-sm mb-2 font-semibold">Workshop/Program (Optional)</label>
              <input
                type="text"
                name="workshopName"
                value={form.values.workshopName || ''}
                onChange={form.handleChange}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2 text-[#0f3a4d] placeholder-[#0f3a4d]/50 focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645]"
                placeholder="e.g., Yoga Retreat 2025, Advanced Pranayama"
              />
            </div>
          </div>
        </FormModal>
      )}

      {/* Duplicate Entry Modal */}
      {duplicateModalOpen && duplicateLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-red-500/30 rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-red-400">Lead Already Exists!</h2>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
              <p className="text-white text-sm"><strong className="text-red-400">Name:</strong> {duplicateLead.name || 'N/A'}</p>
              <p className="text-white text-sm"><strong className="text-red-400">Email:</strong> {duplicateLead.email || 'N/A'}</p>
              <p className="text-white text-sm"><strong className="text-red-400">Phone:</strong> {duplicateLead.phoneNumber}</p>
              <p className="text-white text-sm"><strong className="text-red-400">Status:</strong> <span className="capitalize font-semibold text-green-400">{duplicateLead.status}</span></p>
              <p className="text-white text-sm"><strong className="text-red-400">Program:</strong> {duplicateLead.workshopName || 'Not assigned'}</p>
              <p className="text-gray-500 text-xs"><strong>Created:</strong> {new Date(duplicateLead.createdAt).toLocaleDateString()}</p>
            </div>

            <p className="text-gray-400 text-sm text-center">
              This lead is already in the system. No duplicate entries are allowed.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDuplicateModalOpen(false);
                  setDuplicateLead(null);
                  router.push(`/admin/crm/leads/${duplicateLead._id}`);
                }}
                className="flex-1 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2.5 rounded-xl hover:bg-green-500/30 transition-all duration-300 font-medium"
              >
                View Lead
              </button>
              <button
                onClick={() => {
                  setDuplicateModalOpen(false);
                  setDuplicateLead(null);
                  modal.close();
                  form.resetForm();
                }}
                className="flex-1 bg-white/5 border border-white/20 text-white px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all duration-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-green-500/30 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-green-400">📄 Bulk Import Leads</h2>
              <button
                onClick={() => {
                  setBulkImportModalOpen(false);
                  setCsvContacts([]);
                  setCsvColumnMap(null);
                  setCsvFileName('');
                  setCsvWorkshopOverride('');
                  setCsvSourceOverride('');
                  setCsvAssignAdmin('');
                }}
                className="text-gray-500 hover:text-white text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            {/* Download Demo Template */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-400">📥 Need a sample format?</p>
                  <p className="text-xs text-blue-300/70">Download demo Excel template with required columns</p>
                </div>
                <button
                  onClick={() => {
                    // Create demo Excel template
                    const demoData = [
                      { 
                        'Name': 'Rahul Sharma', 
                        'Phone Number': '9876543210', 
                        'Email': 'rahul@example.com',
                        'Status': 'lead',
                        'Source': 'Website',
                        'Workshop Name': 'Swar Vidnyan Feb 2026',
                        'Address': 'Mumbai, Maharashtra',
                        'Labels': 'New, Interested'
                      },
                      { 
                        'Name': 'Priya Patel', 
                        'Phone Number': '9123456789', 
                        'Email': 'priya@example.com',
                        'Status': 'prospect',
                        'Source': 'Referral',
                        'Workshop Name': 'Swar Vidnyan Feb 2026',
                        'Address': 'Pune, Maharashtra',
                        'Labels': 'Call Pending'
                      },
                      { 
                        'Name': 'Amit Kumar', 
                        'Phone Number': '9988776655', 
                        'Email': 'amit@example.com',
                        'Status': 'lead',
                        'Source': 'Facebook',
                        'Workshop Name': '',
                        'Address': 'Delhi',
                        'Labels': ''
                      },
                    ];
                    const ws = XLSX.utils.json_to_sheet(demoData);
                    // Set column widths
                    ws['!cols'] = [
                      { wch: 20 }, // Name
                      { wch: 15 }, // Phone Number
                      { wch: 25 }, // Email
                      { wch: 12 }, // Status
                      { wch: 12 }, // Source
                      { wch: 25 }, // Workshop Name
                      { wch: 25 }, // Address
                      { wch: 20 }, // Labels
                    ];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
                    XLSX.writeFile(wb, 'leads_import_template.xlsx');
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  ⬇️ Download Template
                </button>
              </div>
              <div className="mt-3 text-xs text-blue-300/80 space-y-0.5">
                <p><strong className="text-blue-400">Required:</strong> Phone Number</p>
                <p><strong className="text-blue-400">Optional:</strong> Name, Email, Status, Source, Workshop Name, Address, Labels</p>
                <p><strong className="text-blue-400">Status values:</strong> lead, hot, prospect, customer, inactive</p>
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
                // Auto-detect first workshop value for override
                if (colMap?.workshop) {
                  const first = contacts.find(c => c.raw[colMap.workshop!]?.trim());
                  setCsvWorkshopOverride(first ? first.raw[colMap.workshop!].trim() : '');
                } else {
                  setCsvWorkshopOverride('');
                }
                // Auto-detect first source value for override
                if (colMap?.source) {
                  const first = contacts.find(c => c.raw[colMap.source!]?.trim());
                  setCsvSourceOverride(first ? first.raw[colMap.source!].trim() : '');
                } else {
                  setCsvSourceOverride('');
                }
              }}
              onRemove={() => {
                setCsvContacts([]);
                setCsvColumnMap(null);
                setCsvFileName('');
                setCsvWorkshopOverride('');
                setCsvSourceOverride('');
                setCsvAssignAdmin('');
              }}
            />

            {csvContacts.length > 0 && (
              <>
                {/* Editable overrides for workshop & source */}
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-green-400 block mb-1">Workshop Name (applies to all)</label>
                    <input
                      type="text"
                      value={csvWorkshopOverride}
                      onChange={e => setCsvWorkshopOverride(e.target.value)}
                      placeholder="e.g. Swar Vidnyan Feb 2026"
                      className="w-full px-3 py-2 text-sm border border-white/20 rounded-xl bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-green-400 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-green-400 block mb-1">👤 Assign to Admin</label>
                    <select
                      value={csvAssignAdmin}
                      onChange={e => setCsvAssignAdmin(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-green-400 focus:outline-none font-medium transition-all"
                    >
                      <option value="" className="bg-[#1a1a1a]">— Current logged-in user (default) —</option>
                      {adminUsersList.length === 0 ? (
                        <option disabled className="bg-[#1a1a1a]">Loading admin users...</option>
                      ) : (
                        adminUsersList.map(u => (
                          <option key={u.userId} value={u.userId} className="bg-[#1a1a1a]">
                            {u.name} {u.role ? `(${u.role})` : ''} • {u.email}
                          </option>
                        ))
                      )}
                    </select>
                    {adminUsersList.length > 0 && (
                      <p className="text-green-400/70 text-xs mt-1">
                        {adminUsersList.length} admin user(s) available
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-green-400 block mb-1">Source (applies to all)</label>
                    <input
                      type="text"
                      value={csvSourceOverride}
                      onChange={e => setCsvSourceOverride(e.target.value)}
                      placeholder="e.g. Website, Referral, Event"
                      className="w-full px-3 py-2 text-sm border border-white/20 rounded-xl bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-green-400 focus:outline-none transition-all"
                    />
                  </div>
                  <p className="text-white text-sm font-bold pt-1">
                    Ready to import {csvContacts.length} contacts as leads
                  </p>
                  <p className="text-gray-400 text-xs">
                    Duplicate phone numbers will be skipped. Missing fields will be filled later.
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <button
                disabled={csvContacts.length === 0 || csvImporting}
                onClick={async () => {
                  if (!token || csvContacts.length === 0) return;
                  setCsvImporting(true);
                  try {
                    // Build contacts payload with all detected columns
                    const payload = csvContacts.map(c => {
                      const row: any = { phoneNumber: c.phoneNumber };
                      if (c.name) row.name = c.name;
                      if (c.email) row.email = c.email;
                      // Extract extra columns from raw csv row
                      if (csvColumnMap?.status) {
                        const v = c.raw[csvColumnMap.status]?.trim();
                        if (v) row.status = v;
                      }
                      // Use override values (editable by user) instead of raw CSV values
                      if (csvSourceOverride.trim()) {
                        row.source = csvSourceOverride.trim();
                      } else if (csvColumnMap?.source) {
                        const v = c.raw[csvColumnMap.source]?.trim();
                        if (v) row.source = v;
                      }
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
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        contacts: payload,
                        ...(csvAssignAdmin ? { assignedToUserId: csvAssignAdmin } : {}),
                      }),
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                      let msg = `✅ Imported ${data.data.imported} new leads!`;
                      if (data.data.duplicates > 0) msg += `\n📋 ${data.data.duplicates} already exist (skipped)`;
                      if (data.data.skipped > 0) msg += `\n⚠️ ${data.data.skipped} invalid (phone errors)`;
                      if (data.data.failed > 0) {
                        msg += `\n❌ ${data.data.failed} failed`;
                        if (Array.isArray(data.data.errors) && data.data.errors.length > 0) {
                          const reasons = data.data.errors.slice(0, 5).map((e: any) => `  ${e.phone}: ${e.reason}`).join('\n');
                          msg += `\n${reasons}`;
                          if (data.data.errors.length > 5) msg += `\n  ...and ${data.data.errors.length - 5} more`;
                        }
                      }
                      alert(msg);
                      setBulkImportModalOpen(false);
                      setCsvContacts([]);
                      setCsvColumnMap(null);
                      setCsvFileName('');
                      setCsvWorkshopOverride('');
                      setCsvSourceOverride('');
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
                className="flex-1 bg-green-500 border border-green-400/50 text-white px-4 py-2.5 rounded-xl hover:bg-green-400 transition-all duration-300 font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
              >
                {csvImporting ? '⏳ Importing...' : `Import ${csvContacts.length} Leads`}
              </button>
              <button
                onClick={() => {
                  setBulkImportModalOpen(false);
                  setCsvContacts([]);
                  setCsvColumnMap(null);
                  setCsvFileName('');
                  setCsvWorkshopOverride('');
                  setCsvSourceOverride('');
                  setCsvAssignAdmin('');
                }}
                disabled={csvImporting}
                className="flex-1 bg-white/5 border border-white/20 text-white px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all duration-300 font-medium disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Broadcast Modal */}
      <AddToBroadcastModal
        isOpen={broadcastModalOpen}
        onClose={() => {
          setBroadcastModalOpen(false);
          setLeadsForBroadcast([]);
        }}
        leads={leadsForBroadcast}
        token={token || undefined}
        onSuccess={(result) => {
          setError(null);
          // Show success message
          setTimeout(() => {
            let msg = `✓ Added ${result.added} leads to "${result.listName}".`;
            if (result.skipped > 0) {
              msg += `\nℹ️ Skipped ${result.skipped} (duplicates or errors).`;
            }
            if (result.errors && result.errors.length > 0) {
              msg += `\n⚠️ First few errors:\n${result.errors.slice(0, 3).join('\n')}`;
            }
            alert(msg);

            // Clear selection only if at least one was added or skipped (processed)
            if (result.added > 0 || result.skipped > 0) {
              setSelectedLeadIds(new Set());
            }
          }, 100);
        }}
      />
    </div>
  );
}
