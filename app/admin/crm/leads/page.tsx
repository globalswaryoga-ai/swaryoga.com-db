'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { useSearch } from '@/hooks/useSearch';
import { useModal } from '@/hooks/useModal';
import { useForm } from '@/hooks/useForm';
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
  createdAt: string;
}

type LeadFormValues = {
  name: string;
  email: string;
  phoneNumber: string;
  source: Lead['source'] | string;
  status: Lead['status'];
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

  const fetchLeads = useCallback(async () => {
    const params: Record<string, any> = { limit, skip };
    if (search.query) params.q = search.query;

    const result = await crm.fetch('/api/admin/crm/leads', { params });
    // API returns { leads, total, limit, skip }
    setLeads(result?.leads || []);
    setTotal(result?.total || 0);
  }, [crm, limit, skip, search.query]);

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
        },
      });

      modal.close();
      form.resetForm();
      setSkip(0);
      await fetchLeads();
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
    },
    onSubmit: handleCreateLead,
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchLeads();
  }, [token, router, fetchLeads]);

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const response = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete lead');
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
      fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
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
            <button
              onClick={modal.open}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all"
            >
              + Add Lead
            </button>
          }
        />

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
          </div>
        </FormModal>
      )}
    </div>
  );
}
