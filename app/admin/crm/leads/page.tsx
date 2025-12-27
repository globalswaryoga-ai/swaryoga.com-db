'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { useSearch } from '@/hooks/useSearch';
import { useModal } from '@/hooks/useModal';
import { useForm } from '@/hooks/useForm';
import * as XLSX from 'xlsx';
import {
  DataTable,
  FormModal,
  StatusBadge,
  Toolbar,
  PageHeader,
  LoadingSpinner,
  AlertBox,
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
  email?: string;
  permissions?: string[];
};

export default function LeadsPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const search = useSearch();
  const modal = useModal();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterWorkshop, setFilterWorkshop] = useState<string>('');
  const [workshops, setWorkshops] = useState<string[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [workshopCounts, setWorkshopCounts] = useState<Record<string, number>>({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<any>(null);

  const [backfillBusy, setBackfillBusy] = useState(false);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userFilter, setUserFilter] = useState<string>('');
  const [userOptions, setUserOptions] = useState<AdminUserOption[]>([]);

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
      setIsSuperAdmin((u?.userId === 'admin') || perms.includes('all'));
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
      User: lead.assignedToUserId || '',
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

  const columns: LeadColumn[] = [
    {
      key: 'leadNumber',
      label: 'Lead ID',
      render: (val: any) => (
        <div className="border-2 border-red-500 rounded-lg px-3 py-2 bg-red-50 text-center">
          <div className="text-xs font-bold text-red-700 mb-1">LEAD ID</div>
          <div className="font-mono font-bold text-red-700">{val || '-'}</div>
        </div>
      ),
    },
    {
      key: 'assignedToUserId',
      label: 'User',
      render: (val: any) => (
        <div className="bg-green-800 text-white rounded-lg px-3 py-2 text-center font-semibold">
          {val || 'Unassigned'}
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
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300"
              >
                {String(label)}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">—</span>
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
          className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-600 rounded-full text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer hover:from-emerald-600 hover:to-teal-700 transition-all"
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
      render: (_: any, lead: Lead) => (
        <div className="flex gap-2 items-center relative">
          <button
            onClick={() => router.push(`/admin/crm/leads/${lead._id}`)}
            className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium transition-colors"
            title="View lead details"
          >
            View
          </button>

          <button
            onClick={() => router.push('/admin/crm/leads-followup')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            title="Open lead followup"
          >
            Followup
          </button>

          <button
            onClick={() => handleDeleteLead(lead._id)}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
            title="Delete lead"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header - Professional */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/crm')}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                title="Go to CRM Dashboard"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Lead Management</h1>
                <p className="text-slate-600 text-lg">Manage and track all customer leads efficiently</p>
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
              onClick={() => setBulkModalOpen(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-all font-semibold border border-blue-200"
            >
              📤 Bulk Upload
            </button>
            <button
              onClick={modal.open}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-2 rounded-lg transition-all font-bold shadow-md hover:shadow-lg"
            >
              + Add Lead
            </button>
          </div>
        </div>

        {/* Filters Section - Professional Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Filters & Search</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status Filter */}
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-3">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
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
              <label className="block text-slate-700 text-sm font-semibold mb-3">Program/Workshop</label>
              <select
                value={filterWorkshop}
                onChange={(e) => {
                  setFilterWorkshop(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
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
                <label className="block text-slate-700 text-sm font-semibold mb-3">Admin User</label>
                <select
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value);
                    setSkip(0);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
                >
                  <option value="">All Users</option>
                  {userOptions.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.email || u.userId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Box */}
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-3">Search</label>
              <input
                type="text"
                placeholder="Name, email, phone..."
                value={search.query}
                onChange={(e) => {
                  search.setQuery(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-medium placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
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
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full animate-spin">
                <div className="w-10 h-10 bg-white rounded-full"></div>
              </div>
              <p className="text-slate-600 font-medium">Loading leads...</p>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No leads found</h3>
            <p className="text-slate-600 mb-6">Start by adding a new lead or uploading from a file</p>
            <button
              onClick={modal.open}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              + Add Your First Lead
            </button>
          </div>
        ) : (
          <>
            {/* Data Table - Professional Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, idx) => (
                      <tr
                        key={lead._id}
                        className={`border-b border-slate-200 transition-colors relative ${
                          idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="px-6 py-4 text-sm text-slate-900">
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
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between">
                <div className="text-slate-600 font-medium">
                  Showing <span className="font-bold text-slate-900">{skip + 1}</span> to{' '}
                  <span className="font-bold text-slate-900">{Math.min(skip + limit, total)}</span> of{' '}
                  <span className="font-bold text-slate-900">{total}</span> leads
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                    disabled={skip === 0}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg font-medium transition-all"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center px-4 text-slate-600 font-medium">
                    Page {Math.floor(skip / limit) + 1} of {Math.ceil(total / limit)}
                  </div>
                  <button
                    onClick={() => {
                      if (skip + limit < total) setSkip(skip + limit);
                    }}
                    disabled={skip + limit >= total}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
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
            {isSuperAdmin && (
              <div>
                <label className="block text-purple-200 text-sm mb-2">Assign to User (Optional)</label>
                <select
                  name="assignedToUserId"
                  value={form.values.assignedToUserId || ''}
                  onChange={form.handleChange}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">(Default: current admin)</option>
                  {userOptions.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.userId}
                    </option>
                  ))}
                </select>
                <p className="text-purple-300 text-xs mt-1">This controls which user can see/manage this lead.</p>
              </div>
            )}
            <div>
              <label className="block text-purple-200 text-sm mb-2">Name *</label>
              <input
                type="text"
                required
                name="name"
                value={form.values.name}
                onChange={form.handleChange}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500"
                placeholder="Lead name"
              />
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Email *</label>
              <input
                type="email"
                required
                name="email"
                value={form.values.email}
                onChange={form.handleChange}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Phone Number *</label>
              <input
                type="tel"
                required
                name="phoneNumber"
                value={form.values.phoneNumber}
                onChange={form.handleChange}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500"
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Source</label>
              <select
                name="source"
                value={form.values.source}
                onChange={form.handleChange}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Status</label>
              <select
                name="status"
                value={form.values.status}
                onChange={form.handleChange}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Workshop/Program (Optional)</label>
              <input
                type="text"
                name="workshopName"
                value={form.values.workshopName || ''}
                onChange={form.handleChange}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500"
                placeholder="e.g., Yoga Retreat 2025, Advanced Pranayama"
              />
            </div>
          </div>
        </FormModal>
      )}

      {/* Duplicate Entry Modal */}
      {duplicateModalOpen && duplicateLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white border-2 border-red-300 rounded-xl p-8 max-w-md w-full space-y-6 shadow-2xl\">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-red-300">Lead Already Exists!</h2>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-white text-sm"><strong>Name:</strong> {duplicateLead.name || 'N/A'}</p>
              <p className="text-white text-sm"><strong>Email:</strong> {duplicateLead.email || 'N/A'}</p>
              <p className="text-white text-sm"><strong>Phone:</strong> {duplicateLead.phoneNumber}</p>
              <p className="text-white text-sm"><strong>Status:</strong> <span className="capitalize font-semibold">{duplicateLead.status}</span></p>
              <p className="text-white text-sm"><strong>Program:</strong> {duplicateLead.workshopName || 'Not assigned'}</p>
              <p className="text-purple-200 text-xs"><strong>Created:</strong> {new Date(duplicateLead.createdAt).toLocaleDateString()}</p>
            </div>

            <p className="text-purple-300 text-sm text-center">
              This lead is already in the system. No duplicate entries are allowed.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDuplicateModalOpen(false);
                  setDuplicateLead(null);
                  router.push(`/admin/crm/leads/${duplicateLead._id}`);
                }}
                className="flex-1 bg-blue-500/20 border border-blue-500 text-blue-200 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors font-medium"
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
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-300 px-4 py-2 rounded-lg hover:border-slate-500 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white border-2 border-green-300 rounded-xl p-8 max-w-md w-full space-y-6 shadow-2xl\">
            <h2 className="text-xl font-bold text-green-700\">Bulk Import Leads</h2>
            
            <div className="space-y-4\">
              <div>
                <label className="block text-green-700 text-sm mb-2 font-semibold\">Upload Excel File</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  id="bulk-upload"
                  className="w-full"
                />
                <p className="text-green-600 text-xs mt-2\">
                  Format: Name, Email, Phone, Status, Source, Workshop/Program
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-3 text-green-700 text-sm border-2 border-green-200">
                <p className="font-semibold mb-2">Instructions:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Required: Name, Email, Phone</li>
                  <li>Optional: Status (lead/prospect/customer/inactive)</li>
                  <li>Optional: Source (website/referral/social/event)</li>
                  <li>Optional: Workshop/Program name</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const input = document.getElementById('bulk-upload') as HTMLInputElement;
                  const file = input?.files?.[0];
                  if (!file) {
                    alert('Please select a file');
                    return;
                  }

                  const formData = new FormData();
                  formData.append('file', file);

                  try {
                    const response = await fetch('/api/admin/crm/leads/upload', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                      body: formData,
                    });

                    if (response.ok) {
                      const data = await response.json();
                      alert(`Successfully imported ${data.data.imported} leads!\n${data.data.skipped} duplicates skipped.`);
                      setBulkModalOpen(false);
                      fetchMetadata();
                      fetchLeads();
                    } else {
                      const error = await response.json();
                      alert(`Error: ${error.error}`);
                    }
                  } catch (err) {
                    alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  }
                }}
                className="flex-1 bg-green-500/20 border border-green-500 text-green-800 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors font-medium"
              >
                Upload
              </button>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-300 px-4 py-2 rounded-lg hover:border-slate-500 transition-colors font-medium"
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
