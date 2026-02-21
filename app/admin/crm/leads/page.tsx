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
  status: 'lead' | 'prospect' | 'customer' | 'inactive';
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
  const [csvUpdateExisting, setCsvUpdateExisting] = useState(false);
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
              className="h-4 w-4 accent-[#E8A645] cursor-pointer"
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
        <div className="border-2 border-[#0f3a4d] rounded-lg px-3 py-2 bg-[#F5EBE0] text-center">
          <div className="text-xs font-bold text-[#0f3a4d] mb-1">LEAD ID</div>
          <div className="font-mono font-bold text-[#0f3a4d]">{val || '-'}</div>
        </div>
      ),
    },
    {
      key: 'assignedToUserId',
      label: 'User',
      render: (val: any) => (
        <div className="bg-[#0f3a4d] text-white rounded-lg px-3 py-2 text-center font-semibold">
          {getAssigneeLabel(val) || 'Unassigned'}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name & Contact',
      render: (name: any, lead: Lead) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-900 break-words">{String(name || 'N/A')}</div>
          <div className="text-xs text-slate-600 break-words">{lead.email || 'N/A'}</div>
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
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#E8A645]/20 text-[#0f3a4d] border border-[#E8A645]"
              >
                {String(label)}
              </span>
            ))
          ) : (
            <span className="text-[#0f3a4d] text-xs opacity-50">—</span>
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
          className="px-3 py-1.5 bg-[#0f3a4d] border border-[#0f3a4d] rounded-full text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#E8A645] cursor-pointer hover:bg-[#1a4d5c] transition-all"
        >
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="customer">Customer</option>
          <option value="inactive">Inactive</option>
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
        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
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
            className="px-3 py-1.5 bg-[#F5EBE0] hover:bg-[#E8DFD5] text-[#0f3a4d] rounded-lg text-sm font-medium transition-colors"
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
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              title="Open in Meta Inbox"
            >
              <span aria-hidden>💬</span>
              WhatsApp
            </button>
          ) : (
            <button
              disabled
              className="px-3 py-1.5 bg-gray-200 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-1"
              title="This lead is assigned to another user"
            >
              <span aria-hidden>🔒</span>
              WhatsApp
            </button>
          )}

          <button
            onClick={() => router.push(`/admin/crm/leads-followup?leadId=${encodeURIComponent(lead._id)}`)}
            className="px-3 py-1.5 bg-[#E8A645] hover:bg-[#d4941e] text-white rounded-lg text-sm font-medium transition-colors"
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
            className="px-3 py-1.5 bg-[#F5EBE0] hover:bg-[#E8DFD5] text-[#0f3a4d] rounded-lg text-sm font-medium transition-colors"
            title="Open Broadcast with current filters"
          >
            📢 Broadcast
          </button>

          <button
            onClick={() => handleDeleteLead(lead._id)}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
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
    <div className="min-h-screen bg-[#FAFAF8] flex">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header - Professional */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/crm')}
                className="p-2 hover:bg-[#E8DFD5] rounded-lg transition-colors text-[#0f3a4d] hover:text-[#0f3a4d]"
                title="Go to CRM Dashboard"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div>
                <h1 className="text-4xl font-bold text-[#0f3a4d]">Lead Management</h1>
                <p className="text-[#0f3a4d]/70 text-lg">Manage and track all customer leads efficiently</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <button
              onClick={() => router.push('/admin/crm/leads/deleted')}
              className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg transition-all font-semibold border border-red-200 flex items-center gap-2"
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
                className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg transition-all disabled:opacity-60 font-semibold border border-amber-200"
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
              className="bg-[#F5EBE0] hover:bg-[#E8DFD5] text-[#0f3a4d] px-4 py-2 rounded-lg transition-all font-semibold border border-[#E8DFD5]"
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
              className="bg-[#F5EBE0] hover:bg-[#E8DFD5] text-[#0f3a4d] px-4 py-2 rounded-lg transition-all font-semibold border border-[#E8DFD5] flex items-center gap-2"
              title="Go to broadcast page with current filters applied"
            >
              � To Broadcast
            </button>
            <button
              onClick={modal.open}
              className="bg-gradient-to-r from-[#0f3a4d] to-[#0f3a4d] hover:from-[#1a4d5c] hover:to-[#1a4d5c] text-white px-6 py-2 rounded-lg transition-all font-bold shadow-md hover:shadow-lg"
            >
              + Add Lead
            </button>
          </div>
        </div>

        {/* Filters Section - Professional Card */}
        <div className="bg-[#FAFAF8] border border-[#E8DFD5] rounded-xl p-8 shadow-sm">
          <h2 className="text-sm font-bold text-[#0f3a4d] uppercase tracking-wider mb-6">Filters & Search</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status Filter */}
            <div>
              <label htmlFor="filter-status" className="block text-[#0f3a4d] text-sm font-semibold mb-3">Status</label>
              <select
                id="filter-status"
                name="status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2.5 text-[#0f3a4d] font-medium focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645] transition-all"
              >
                <option value="">All Status ({total})</option>
                <option value="lead">Lead ({statusCounts.lead || 0})</option>
                <option value="prospect">Prospect ({statusCounts.prospect || 0})</option>
                <option value="customer">Customer ({statusCounts.customer || 0})</option>
                <option value="inactive">Inactive ({statusCounts.inactive || 0})</option>
              </select>
            </div>

            {/* Workshop Filter */}
            <div>
              <label htmlFor="filter-workshop" className="block text-[#0f3a4d] text-sm font-semibold mb-3">Program/Workshop</label>
              <select
                id="filter-workshop"
                name="workshop"
                value={filterWorkshop}
                onChange={(e) => {
                  setFilterWorkshop(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2.5 text-[#0f3a4d] font-medium focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645] transition-all"
              >
                <option value="">All Programs</option>
                {workshops.map((workshop) => (
                  <option key={workshop} value={workshop}>
                    {workshop} ({workshopCounts[workshop] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            {isSuperAdmin && (
              <div>
                <label htmlFor="filter-user" className="block text-[#0f3a4d] text-sm font-semibold mb-3">Admin User</label>
                <select
                  id="filter-user"
                  name="user"
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value);
                    setSkip(0);
                  }}
                  className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2.5 text-[#0f3a4d] font-medium focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645] transition-all"
                >
                  <option value="">All Users</option>
                  {userOptions.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name || u.email || u.userId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Box */}
            <div>
              <label htmlFor="search-input" className="block text-[#0f3a4d] text-sm font-semibold mb-3">Search</label>
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
                className="w-full bg-white border border-[#E8DFD5] rounded-lg px-4 py-2.5 text-[#0f3a4d] font-medium placeholder-[#0f3a4d]/50 focus:outline-none focus:border-[#E8A645] focus:ring-1 focus:ring-[#E8A645] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-700 flex justify-between items-center">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold text-xl">×</button>
          </div>
        )}

        {/* Loading State */}
        {crm.loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full animate-spin">
                <div className="w-10 h-10 bg-white rounded-full"></div>
              </div>
              <p className="text-slate-600 font-medium">Loading leads...</p>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-[#FAFAF8] border border-[#E8DFD5] rounded-xl p-12 text-center shadow-sm">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-[#0f3a4d] mb-2">No leads found</h3>
            <p className="text-[#0f3a4d]/70 mb-6">Start by adding a new lead or uploading from a file</p>
            <button
              onClick={modal.open}
              className="bg-gradient-to-r from-[#0f3a4d] to-[#0f3a4d] hover:from-[#1a4d5c] hover:to-[#1a4d5c] text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              + Add Your First Lead
            </button>
          </div>
        ) : (
          <>
            {/* Bulk Actions Bar */}
            {selectedLeadIds.size > 0 && (
              <div className="bg-[#F5EBE0] border border-[#E8DFD5] rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="font-semibold text-[#0f3a4d]">
                    Selected: {selectedLeadIds.size}
                  </div>

                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 bg-white border border-teal-200 text-teal-800 rounded-lg font-semibold hover:bg-teal-100 transition-colors"
                  >
                    Clear
                  </button>
                  
                  <button
                    onClick={() => {
                      const selectedLeads = leads.filter((l) => selectedLeadIds.has(l._id));
                      setLeadsForBroadcast(selectedLeads);
                      setBroadcastModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#E8A645]/20 border border-[#E8A645] text-[#0f3a4d] rounded-lg font-semibold hover:bg-[#E8A645]/40 transition-colors flex items-center gap-1"
                  >
                    📢 Add to Broadcast
                  </button>

                  <button
                    onClick={() => toggleSelectAllOnPage()}
                    className="px-3 py-1.5 bg-white border border-teal-200 text-teal-800 rounded-lg font-semibold hover:bg-teal-100 transition-colors"
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
                      className="bg-white border border-teal-200 rounded-lg px-3 py-2 text-teal-900 font-semibold"
                    >
                      <option value="">Assign User (optional)</option>
                      {userOptions.map((u) => (
                        <option key={u.userId} value={u.userId}>
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
                    className="bg-white border border-teal-200 rounded-lg px-3 py-2 text-teal-900 font-semibold"
                  />

                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="bg-white border border-teal-200 rounded-lg px-3 py-2 text-teal-900 font-semibold"
                  >
                    <option value="">Set Status (optional)</option>
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Customer</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <input
                    type="text"
                    value={bulkLabels}
                    onChange={(e) => setBulkLabels(e.target.value)}
                    placeholder="Add labels (select or type)"
                    list="bulk-labels-list"
                    className="bg-white border border-teal-200 rounded-lg px-3 py-2 text-teal-900 font-semibold"
                  />
                  <datalist id="bulk-labels-list">
                    {PREDEFINED_LABELS.map(label => (
                        <option key={label} value={label} />
                    ))}
                  </datalist>

                  <button
                    onClick={runBulkUpdate}
                    disabled={bulkActionBusy}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
                  >
                    {bulkActionBusy ? 'Updating…' : 'Apply Bulk Update'}
                  </button>
                </div>
              </div>
            )}

            {/* Data Table - Professional Card */}
            <div className="bg-[#FAFAF8] border border-[#E8DFD5] rounded-xl shadow-sm overflow-visible">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#F5EBE0] to-[#E8DFD5] border-b border-[#E8DFD5]">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-6 py-4 text-left text-sm font-bold text-[#0f3a4d] uppercase tracking-wider"
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
                                className="h-4 w-4 accent-teal-600 cursor-pointer"
                                aria-label="Select all leads on this page"
                              />
                              <span className="text-xs text-[#0f3a4d]/70">All</span>
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
                        className={`border-b border-[#E8DFD5] transition-colors relative ${
                          idx % 2 === 0 ? 'bg-[#FAFAF8] hover:bg-[#F5EBE0]/80' : 'bg-[#F5EBE0]/40 hover:bg-[#F5EBE0]/80'
                        }`}
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="px-6 py-4 text-sm text-[#0f3a4d]">
                            {col.render ? col.render((lead as any)[col.key], lead) : (lead as any)[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination - Professional */}
            {leads.length > 0 && (
              <div className="bg-[#FAFAF8] border border-[#E8DFD5] rounded-xl p-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-[#0f3a4d]/70 font-medium">
                    Showing <span className="font-bold text-[#0f3a4d]">{skip + 1}</span> to{' '}
                    <span className="font-bold text-[#0f3a4d]">{Math.min(skip + limit, total)}</span> of{' '}
                    <span className="font-bold text-[#0f3a4d]">{total}</span> leads
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#0f3a4d]/70 text-sm">Show:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value);
                        setLimit(newLimit);
                        setSkip(0);
                      }}
                      className="bg-white border border-[#E8DFD5] rounded-lg px-2 py-1 text-sm text-[#0f3a4d] focus:outline-none focus:border-[#E8A645]"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                    disabled={skip === 0}
                    className="px-4 py-2 bg-[#F5EBE0] hover:bg-[#E8DFD5] disabled:opacity-50 disabled:cursor-not-allowed text-[#0f3a4d] rounded-lg font-medium transition-all"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center px-4 text-[#0f3a4d]/70 font-medium">
                    Page {Math.floor(skip / limit) + 1} of {Math.max(1, Math.ceil(total / limit))}
                  </div>
                  <button
                    onClick={() => {
                      if (skip + limit < total) setSkip(skip + limit);
                    }}
                    disabled={skip + limit >= total}
                    className="px-4 py-2 bg-[#0f3a4d] hover:bg-[#1a4d5c] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white border-2 border-red-300 rounded-xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-red-700">Lead Already Exists!</h2>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <p className="text-red-900 text-sm"><strong>Name:</strong> {duplicateLead.name || 'N/A'}</p>
              <p className="text-red-900 text-sm"><strong>Email:</strong> {duplicateLead.email || 'N/A'}</p>
              <p className="text-red-900 text-sm"><strong>Phone:</strong> {duplicateLead.phoneNumber}</p>
              <p className="text-red-900 text-sm"><strong>Status:</strong> <span className="capitalize font-semibold">{duplicateLead.status}</span></p>
              <p className="text-red-900 text-sm"><strong>Program:</strong> {duplicateLead.workshopName || 'Not assigned'}</p>
              <p className="text-slate-600 text-xs"><strong>Created:</strong> {new Date(duplicateLead.createdAt).toLocaleDateString()}</p>
            </div>

            <p className="text-slate-600 text-sm text-center">
              This lead is already in the system. No duplicate entries are allowed.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDuplicateModalOpen(false);
                  setDuplicateLead(null);
                  router.push(`/admin/crm/leads/${duplicateLead._id}`);
                }}
                className="flex-1 bg-teal-500/20 border border-teal-500 text-teal-700 px-4 py-2 rounded-lg hover:bg-teal-500/30 transition-colors font-medium"
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
                className="flex-1 bg-slate-100 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white border-2 border-teal-300 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-teal-700">📄 Bulk Import Leads</h2>
              <button
                onClick={() => {
                  setBulkImportModalOpen(false);
                  setCsvContacts([]);
                  setCsvColumnMap(null);
                  setCsvFileName('');
                  setCsvWorkshopOverride('');
                  setCsvSourceOverride('');
                  setCsvAssignAdmin('');
                  setCsvUpdateExisting(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Demo Download Button */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <span className="font-semibold">📥 Need a template?</span>
                <span className="ml-2 text-blue-600">Download sample Excel format</span>
              </div>
              <button
                onClick={() => {
                  // Generate demo Excel file
                  const demoData = [
                    { Name: 'John Doe', Phone: '9876543210', Email: 'john@example.com', Status: 'lead', Source: 'Website', Workshop: 'Swar Yoga Batch 1', Address: 'Mumbai' },
                    { Name: 'Jane Smith', Phone: '+91 98765 12345', Email: 'jane@example.com', Status: 'prospect', Source: 'Referral', Workshop: 'Swar Yoga Batch 1', Address: 'Delhi' },
                    { Name: 'Ram Kumar', Phone: '919876500001', Email: 'ram@example.com', Status: 'customer', Source: 'Facebook', Workshop: 'Swar Yoga Batch 2', Address: 'Chennai' },
                    { Name: 'Priya Sharma', Phone: '9779856032334', Email: 'priya@example.com', Status: 'lead', Source: 'WhatsApp', Workshop: 'Online Workshop', Address: 'Kathmandu' },
                  ];
                  const worksheet = XLSX.utils.json_to_sheet(demoData);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
                  // Set column widths
                  worksheet['!cols'] = [
                    { wch: 15 }, // Name
                    { wch: 18 }, // Phone
                    { wch: 25 }, // Email
                    { wch: 10 }, // Status
                    { wch: 12 }, // Source
                    { wch: 20 }, // Workshop
                    { wch: 15 }, // Address
                  ];
                  XLSX.writeFile(workbook, 'leads-import-template.xlsx');
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-1"
              >
                <span>📥</span> Download Template
              </button>
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
                <div className="bg-teal-50 rounded-lg p-3 border border-teal-200 space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-teal-700 block mb-1">Workshop Name (applies to all)</label>
                    <input
                      type="text"
                      value={csvWorkshopOverride}
                      onChange={e => setCsvWorkshopOverride(e.target.value)}
                      placeholder="e.g. Swar Vidnyan Feb 2026"
                      className="w-full px-3 py-1.5 text-sm border border-teal-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-teal-700 block mb-1">👤 Assign to Admin</label>
                    <select
                      value={csvAssignAdmin}
                      onChange={e => setCsvAssignAdmin(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-teal-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none font-medium"
                    >
                      <option value="">— Current logged-in user (default) —</option>
                      {adminUsersList.length === 0 ? (
                        <option disabled>Loading admin users...</option>
                      ) : (
                        adminUsersList.map(u => (
                          <option key={u.userId} value={u.userId}>
                            {u.name} {u.role ? `(${u.role})` : ''} • {u.email}
                          </option>
                        ))
                      )}
                    </select>
                    {adminUsersList.length > 0 && (
                      <p className="text-teal-600 text-xs mt-1">
                        {adminUsersList.length} admin user(s) available
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-teal-700 block mb-1">Source (applies to all)</label>
                    <input
                      type="text"
                      value={csvSourceOverride}
                      onChange={e => setCsvSourceOverride(e.target.value)}
                      placeholder="e.g. Website, Referral, Event"
                      className="w-full px-3 py-1.5 text-sm border border-teal-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    />
                  </div>
                  {/* Update Existing Toggle */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="csvUpdateExisting"
                      checked={csvUpdateExisting}
                      onChange={e => setCsvUpdateExisting(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-teal-300 focus:ring-teal-500"
                    />
                    <label htmlFor="csvUpdateExisting" className="text-sm text-teal-700 font-medium cursor-pointer">
                      Update existing leads (instead of skipping duplicates)
                    </label>
                  </div>
                  <p className="text-teal-800 text-sm font-semibold pt-1">
                    Ready to import {csvContacts.length} contacts as leads
                  </p>
                  <p className="text-teal-600 text-xs">
                    {csvUpdateExisting 
                      ? 'Existing phone numbers will be updated with new data. Missing fields will be filled later.'
                      : 'Duplicate phone numbers will be skipped. Missing fields will be filled later.'}
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
                        updateExisting: csvUpdateExisting,
                        ...(csvAssignAdmin ? { assignedToUserId: csvAssignAdmin } : {}),
                      }),
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                      // Build detailed result message
                      const d = data.data;
                      const details = d.details || {};
                      let msg = `✅ Import Complete!\n\n`;
                      if (d.imported > 0) msg += `✓ ${d.imported} new leads imported\n`;
                      if (d.updated > 0) msg += `✓ ${d.updated} existing leads updated\n`;
                      if (details.duplicatesSkipped > 0) msg += `⊘ ${details.duplicatesSkipped} duplicates skipped\n`;
                      if (details.invalidPhones > 0) msg += `⚠ ${details.invalidPhones} invalid phone numbers\n`;
                      if (details.batchDuplicates > 0) msg += `⊘ ${details.batchDuplicates} duplicates within file\n`;
                      if (d.failed > 0) msg += `✗ ${d.failed} failed to save\n`;
                      alert(msg);
                      setBulkImportModalOpen(false);
                      setCsvContacts([]);
                      setCsvColumnMap(null);
                      setCsvFileName('');
                      setCsvWorkshopOverride('');
                      setCsvSourceOverride('');
                      setCsvAssignAdmin('');
                      setCsvUpdateExisting(false);
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
                className="flex-1 bg-teal-500/20 border border-teal-500 text-teal-700 px-4 py-2 rounded-lg hover:bg-teal-500/30 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="flex-1 bg-slate-100 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium disabled:opacity-40"
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
