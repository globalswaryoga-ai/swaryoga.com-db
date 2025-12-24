'use client';

import { useCallback, useEffect, useState } from 'react';
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

  // Fetch only filter metadata (fast, no lead data)
  const fetchMetadata = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingMetadata(true);
      const response = await fetch('/api/admin/crm/leads/metadata', {
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
  }, [token]);

  // Fetch only current page of leads
  const fetchLeads = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, any> = { limit, skip };
      if (filterStatus) params.status = filterStatus;
      if (filterWorkshop) params.workshop = filterWorkshop;
      if (search.query) params.q = search.query;

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
  }, [token, limit, skip, filterStatus, filterWorkshop, search.query]);

  const handleCreateLead = async (values: LeadFormValues) => {
    try {
      await crm.fetch('/api/admin/crm/leads', {
        method: 'POST',
        body: {
          name: values.name,
          email: values.email,
          phoneNumber: values.phoneNumber,
          source: values.source,
          status: values.status,
          workshopName: values.workshopName,
        },
      });

      modal.close();
      form.resetForm();
      setSkip(0);
      fetchMetadata();
      fetchLeads();
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

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phoneNumber', label: 'Phone' },
    {
      key: 'status',
      label: 'Status',
      render: (status: string, lead: Lead) => (
        <select
          value={status}
          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
          className="px-3 py-1 bg-slate-700/50 border border-purple-500/30 rounded-full text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
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
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, lead: Lead) => (
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/crm/leads/${lead._id}`)}
            className="px-3 py-1 bg-blue-500/20 text-blue-200 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
          >
            View
          </button>
          <button
            onClick={() => handleDeleteLead(lead._id)}
            className="px-3 py-1 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Leads Management"
          action={
            <div className="flex gap-2">
              <button
                onClick={() => setBulkModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all"
              >
                📤 Bulk Upload
              </button>
              <button
                onClick={modal.open}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all"
              >
                + Add Lead
              </button>
            </div>
          }
        />

        {/* Filters & Actions */}
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Status Filter */}
            <div>
              <label className="block text-purple-200 text-sm mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
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
              <label className="block text-purple-200 text-sm mb-2">Filter by Program</label>
              <select
                value={filterWorkshop}
                onChange={(e) => {
                  setFilterWorkshop(e.target.value);
                  setSkip(0);
                }}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">All Programs</option>
                {workshops.map((workshop) => (
                  <option key={workshop} value={workshop}>
                    {workshop} ({workshopCounts[workshop] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-purple-200 text-sm mb-2">Search</label>
              <input
                type="text"
                placeholder="Name, email, phone..."
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Download Button */}
            <div>
              <button
                onClick={downloadExcel}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
              >
                📥 Download Excel
              </button>
            </div>
          </div>

          {/* Results Info */}
          <div className="mt-4 pt-4 border-t border-purple-500/20 text-purple-200 text-sm">
            Showing {leads.length} of {total} leads
            {filterStatus && ` • Status: ${filterStatus}`}
            {filterWorkshop && ` • Program: ${filterWorkshop}`}
          </div>
        </div>

        {/* Error Alert */}
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        {/* Toolbar with Search */}
        <Toolbar
          search={search.query}
          onSearchChange={(q) => {
            search.setQuery(q);
            setSkip(0);
          }}
        />

        {/* Loading State */}
        {crm.loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Data Table */}
            <DataTable
              columns={columns}
              data={leads}
              loading={crm.loading}
              empty={leads.length === 0}
              striped
              hover
            />

            {/* Pagination */}
            {leads.length > 0 && (
              <div className="border-t border-purple-500/20 px-6 py-4 flex items-center justify-between bg-slate-800/50 backdrop-blur rounded-xl">
                <button
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                  disabled={skip === 0}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/30 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-purple-200">
                  Page {Math.floor(skip / limit) + 1} of {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setSkip(skip + limit)}
                  disabled={skip + limit >= total}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/30 transition-colors"
                >
                  Next →
                </button>
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

      {/* Bulk Import Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-purple-500/30 rounded-lg p-8 max-w-md w-full space-y-6">
            <h2 className="text-xl font-bold text-white">Bulk Import Leads</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Upload Excel File</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  id="bulk-upload"
                  className="w-full"
                />
                <p className="text-purple-300 text-xs mt-2">
                  Format: Name, Email, Phone, Status, Source, Workshop/Program
                </p>
              </div>

              <div className="bg-slate-700/50 rounded p-3 text-purple-200 text-sm">
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
                className="flex-1 bg-green-500/20 border border-green-500 text-green-200 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors font-medium"
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
