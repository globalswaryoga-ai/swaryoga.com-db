'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, LoadingSpinner, AlertBox, StatusBadge } from '@/components/admin/crm';

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
  updatedAt: string;
  lastMessageAt?: string;
  metadata?: any;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuth();
  const id = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  // Fetch lead details
  useEffect(() => {
    if (!id || !token) return;

    const fetchLead = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/crm/leads/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load lead: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.data) {
          setLead(data.data);
          setEditForm(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lead');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id, token]);

  const handleStatusChange = async (newStatus: Lead['status']) => {
    if (!lead || !token) return;

    try {
      const response = await fetch(`/api/admin/crm/leads/${lead._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const data = await response.json();
      setLead(data.data);
      setEditForm(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleSaveChanges = async () => {
    if (!lead || !token) return;

    try {
      const response = await fetch(`/api/admin/crm/leads/${lead._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Failed to update lead');

      const data = await response.json();
      setLead(data.data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    }
  };

  if (!token) {
    return <AlertBox type="error" message="Authentication required" />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Lead Details" subtitle="Loading..." />
        <LoadingSpinner />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Lead Details" subtitle="Lead not found" />
        <AlertBox
          type="error"
          message={error || 'Lead not found'}
          onClose={() => router.back()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={lead.name || 'Unnamed Lead'}
        subtitle={`ID: ${lead._id}`}
        action={
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Back
          </button>
        }
      />

      {error && <AlertBox type="error" message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-purple-200 text-sm">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded px-3 py-2 text-white mt-1"
                  />
                ) : (
                  <p className="text-white mt-1">{lead.name || '-'}</p>
                )}
              </div>

              <div>
                <label className="text-purple-200 text-sm">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded px-3 py-2 text-white mt-1"
                  />
                ) : (
                  <p className="text-white mt-1">{lead.email || '-'}</p>
                )}
              </div>

              <div>
                <label className="text-purple-200 text-sm">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phoneNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded px-3 py-2 text-white mt-1"
                  />
                ) : (
                  <p className="text-white mt-1">{lead.phoneNumber || '-'}</p>
                )}
              </div>

              <div>
                <label className="text-purple-200 text-sm">Source</label>
                <p className="text-white mt-1">{lead.source || '-'}</p>
              </div>

              <div>
                <label className="text-purple-200 text-sm">Program/Workshop</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.workshopName || ''}
                    onChange={(e) => setEditForm({ ...editForm, workshopName: e.target.value })}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded px-3 py-2 text-white mt-1"
                    placeholder="e.g., Yoga Retreat 2025"
                  />
                ) : (
                  <p className="text-white mt-1">{lead.workshopName || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status & Labels */}
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Status & Labels</h3>
            <div className="space-y-4">
              <div>
                <label className="text-purple-200 text-sm">Status</label>
                <div className="flex gap-2 mt-2">
                  {['lead', 'prospect', 'customer', 'inactive'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status as Lead['status'])}
                      className={`px-4 py-2 rounded capitalize font-medium transition ${
                        lead.status === status
                          ? 'bg-green-500/20 border border-green-500 text-green-200'
                          : 'bg-slate-700 border border-slate-600 text-slate-300 hover:border-purple-500'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-purple-200 text-sm">Labels</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lead.labels && lead.labels.length > 0 ? (
                    lead.labels.map((label, idx) => (
                      <span
                        key={idx}
                        className="bg-purple-500/20 border border-purple-500 text-purple-200 px-3 py-1 rounded-full text-sm"
                      >
                        {label}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-400 text-sm">No labels</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Metadata */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-purple-200">Created</p>
                <p className="text-white">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-purple-200">Updated</p>
                <p className="text-white">
                  {new Date(lead.updatedAt).toLocaleDateString()}
                </p>
              </div>

              {lead.lastMessageAt && (
                <div>
                  <p className="text-purple-200">Last Message</p>
                  <p className="text-white">
                    {new Date(lead.lastMessageAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-purple-200">Lead ID</p>
                <p className="text-white text-xs font-mono break-all">{lead._id}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  className="flex-1 bg-green-500/20 border border-green-500 text-green-200 px-4 py-2 rounded hover:bg-green-500/30 transition font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(lead);
                  }}
                  className="flex-1 bg-slate-700 border border-slate-600 text-slate-300 px-4 py-2 rounded hover:border-slate-500 transition font-medium"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-purple-500/20 border border-purple-500 text-purple-200 px-4 py-2 rounded hover:bg-purple-500/30 transition font-medium"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
