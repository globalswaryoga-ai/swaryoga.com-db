'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, LoadingSpinner, AlertBox, StatusBadge } from '@/components/admin/crm';
import { normalizePhoneForMeta } from '@/lib/utils/phone';

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
  updatedAt: string;
  lastMessageAt?: string;
  metadata?: any;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuth();
  const crm = useCRM({ token });
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

  const displayPhone = normalizePhoneForMeta(lead.phoneNumber || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6 lead-print-root">
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .lead-print-root { padding: 0 !important; background: #fff !important; }
          .lead-print-hide { display: none !important; }
          .lead-print-card { break-inside: avoid; page-break-inside: avoid; }
          .lead-print-grid { gap: 12px !important; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center lead-print-hide">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/crm')}
              className="p-2 hover:bg-slate-300 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
              title="Go to CRM Dashboard"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div>
              <h1 className="text-3xl font-bold text-slate-900">{lead.name || 'Unnamed Lead'}</h1>
              <p className="text-slate-600">{displayPhone || lead.phoneNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(lead);
                  }}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                Edit
              </button>
            )}

            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Printable A4-style layout (ID left, details right, 4 cards) */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lead-print-grid">
              <div className="lg:col-span-1 lead-print-card">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-6">
                    <div className="text-xs font-semibold tracking-wider text-purple-700 uppercase">Lead ID</div>
                    <div className="mt-2 text-3xl font-black text-slate-900 break-words">
                      {lead.leadNumber || lead._id}
                    </div>
                    <div className="mt-4 text-xs text-slate-500">Source: {lead.source || '-'}</div>
                    <div className="mt-2 text-xs text-slate-500">Assigned: {lead.assignedToUserId || '-'}</div>
                  </div>
                </div>

                {/* RIGHT: name + quick info */}
              <div className="lg:col-span-2 lead-print-card">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">Lead</div>
                        <div className="mt-1 text-3xl font-extrabold text-slate-900">
                          {lead.name || 'Unnamed Lead'}
                        </div>
                        <div className="mt-1 text-slate-700 font-semibold">
                          {displayPhone || lead.phoneNumber || '-'}
                        </div>
                        {lead.email ? <div className="mt-1 text-slate-600">{lead.email}</div> : null}
                      </div>

                      <div className="flex items-center gap-2 lead-print-hide">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveChanges}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setEditForm(lead);
                              }}
                              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            Edit
                          </button>
                        )}

                        <button
                          onClick={() => router.back()}
                          className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                        >
                          ← Back
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-semibold">
                        Status: {lead.status}
                      </span>
                      {lead.workshopName ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-semibold border border-amber-200">
                          Workshop: {lead.workshopName}
                        </span>
                      ) : null}
                    </div>

                    {/* Editable fields */}
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lead-print-hide">
                        <div>
                          <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">Email</div>
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="mt-2 w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">Phone (digits only)</div>
                          <input
                            type="tel"
                            value={editForm.phoneNumber || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, phoneNumber: normalizePhoneForMeta(e.target.value) })
                            }
                            className="mt-2 w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">Workshop</div>
                          <input
                            type="text"
                            value={editForm.workshopName || ''}
                            onChange={(e) => setEditForm({ ...editForm, workshopName: e.target.value })}
                            className="mt-2 w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                            placeholder="e.g., Yoga Retreat 2025"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* CARD 3: Labels */}
              <div className="lg:col-span-1 lead-print-card">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-orange-50 to-white p-6 h-full">
                    <div className="text-xs font-semibold tracking-wider text-orange-700 uppercase">Labels</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {lead.labels && lead.labels.length > 0 ? (
                        lead.labels.map((label) => (
                          <span
                            key={label}
                            className="bg-orange-100 text-orange-900 px-3 py-1 rounded-full font-semibold text-xs border border-orange-200"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <div className="text-slate-500 italic">No labels</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 4: Timeline */}
              <div className="lg:col-span-2 lead-print-card">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 h-full">
                    <div className="text-xs font-semibold tracking-wider text-slate-700 uppercase">Timeline</div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/70 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">Created</div>
                        <div className="mt-2 text-slate-900 font-semibold">
                          {new Date(lead.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-slate-500">{new Date(lead.createdAt).toLocaleTimeString()}</div>
                      </div>

                      <div className="bg-white/70 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">Updated</div>
                        <div className="mt-2 text-slate-900 font-semibold">
                          {new Date(lead.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-slate-500">{new Date(lead.updatedAt).toLocaleTimeString()}</div>
                      </div>

                      <div className="bg-white/70 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">Last message</div>
                        <div className="mt-2 text-slate-900 font-semibold">
                          {lead.lastMessageAt
                            ? new Date(lead.lastMessageAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lead.lastMessageAt ? new Date(lead.lastMessageAt).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

            </div>

              {/* Status quick actions */}
              <div className="mt-6 lead-print-hide">
                <div className="text-sm font-bold text-slate-900 mb-3">Quick status</div>
                <div className="flex flex-wrap gap-3">
                  {(['lead', 'prospect', 'customer', 'inactive'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        lead.status === status
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
          </div>
        </div>

      </div>

    </div>
  );
}
