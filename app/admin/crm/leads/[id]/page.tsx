'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, LoadingSpinner, AlertBox, StatusBadge } from '@/components/admin/crm';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Home Button */}
        <button
          onClick={() => router.push('/admin/crm')}
          className="mb-6 p-2 hover:bg-slate-300 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
          title="Go to CRM Dashboard"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* A4 Page Container */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-4 border-emerald-500 px-12 py-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">{lead.name || 'Unnamed Lead'}</h1>
                <p className="text-slate-600 text-lg">{lead.source || 'N/A'}</p>
              </div>
              {/* Lead ID - Red */}
              <div className="bg-red-50 border-3 border-red-600 rounded-lg px-6 py-4 text-center shadow-lg">
                <p className="text-red-600 text-xs font-bold uppercase tracking-wide mb-1">Lead ID</p>
                <p className="text-red-700 font-mono text-2xl font-extrabold">{lead.leadNumber || lead._id.slice(-6)}</p>
              </div>
            </div>

            {/* Username & Status Row */}
            <div className="flex gap-4 items-center">
              {/* Username - Dark Green Background */}
              <div className="bg-green-800 rounded-lg px-6 py-3 flex-1">
                <p className="text-green-100 text-xs font-semibold mb-1">ASSIGNED TO</p>
                <p className="text-white text-lg font-bold">{lead.assignedToUserId || 'Unassigned'}</p>
              </div>

              {/* Status - Light Green */}
              <div className="bg-green-100 border-2 border-green-400 rounded-lg px-6 py-3 flex-1">
                <p className="text-green-700 text-xs font-semibold mb-1">STATUS</p>
                <p className="text-green-900 text-lg font-bold capitalize">{lead.status || 'lead'}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-12 py-10">
            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6 text-red-700">
                {error}
              </div>
            )}

            {/* Contact Information Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b-2 border-emerald-500">Contact Information</h2>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-slate-600 text-sm font-semibold uppercase mb-2">Email Address</p>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-slate-900 text-lg font-semibold">{lead.email || '-'}</p>
                  )}
                </div>

                <div>
                  <p className="text-slate-600 text-sm font-semibold uppercase mb-2">Phone Number</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phoneNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-slate-900 text-lg font-semibold">{lead.phoneNumber || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Program & Workshop */}
            <div className="mb-10 bg-slate-50 rounded-lg p-6 border-l-4 border-emerald-500">
              <p className="text-slate-600 text-sm font-semibold uppercase mb-2">Program / Workshop</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.workshopName || ''}
                  onChange={(e) => setEditForm({ ...editForm, workshopName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., Yoga Retreat 2025"
                />
              ) : (
                <p className="text-slate-900 text-lg font-semibold">{lead.workshopName || 'Not specified'}</p>
              )}
            </div>

            {/* Labels Section */}
            <div className="mb-10">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Labels</h3>
              <div className="flex flex-wrap gap-3">
                {lead.labels && lead.labels.length > 0 ? (
                  lead.labels.map((label) => (
                    <span
                      key={label}
                      className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-semibold text-sm border border-orange-300"
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <p className="text-slate-500 italic">No labels assigned</p>
                )}
              </div>
            </div>

            {/* Timeline Information */}
            <div className="grid grid-cols-3 gap-6 bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div>
                <p className="text-slate-600 text-xs font-semibold uppercase mb-2">Created Date</p>
                <p className="text-slate-900 font-semibold">{new Date(lead.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-slate-500 text-xs">{new Date(lead.createdAt).toLocaleTimeString()}</p>
              </div>

              <div>
                <p className="text-slate-600 text-xs font-semibold uppercase mb-2">Last Updated</p>
                <p className="text-slate-900 font-semibold">{new Date(lead.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-slate-500 text-xs">{new Date(lead.updatedAt).toLocaleTimeString()}</p>
              </div>

              {lead.lastMessageAt && (
                <div>
                  <p className="text-slate-600 text-xs font-semibold uppercase mb-2">Last Message</p>
                  <p className="text-slate-900 font-semibold">{new Date(lead.lastMessageAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-slate-500 text-xs">{new Date(lead.lastMessageAt).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer with Actions */}
          <div className="bg-slate-50 border-t border-slate-200 px-12 py-6 flex gap-3 justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/admin/crm/whatsapp?leadId=${encodeURIComponent(lead._id)}&phone=${encodeURIComponent(lead.phoneNumber || '')}`)}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.11 17.2c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.64-1.19-1.43-1.33-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.38-.4-.54-.41-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.11.15 1.53.09.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M16 4C9.372 4 4 9.372 4 16c0 2.34.672 4.522 1.834 6.366L4 28l5.79-1.74A11.94 11.94 0 0 0 16 28c6.628 0 12-5.372 12-12S22.628 4 16 4Zm0 21.6c-2.01 0-3.87-.59-5.43-1.6l-.39-.25-3.44 1.03 1.11-3.35-.26-.41A9.56 9.56 0 0 1 6.4 16C6.4 10.7 10.7 6.4 16 6.4S25.6 10.7 25.6 16 21.3 25.6 16 25.6Z"/>
                </svg>
                WhatsApp
              </button>
              <button
                onClick={() => router.push(`/admin/crm/email?leadId=${encodeURIComponent(lead._id)}&email=${encodeURIComponent(lead.email || '')}`)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2 6L12 13L22 6" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Email
              </button>
            </div>

            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveChanges}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm(lead);
                    }}
                    className="px-6 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Edit Details
                </button>
              )}
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Print Note */}
        <div className="mt-6 text-center text-slate-600 text-sm">
          <p>💡 Tip: Use Ctrl+P or Cmd+P to print this lead information as PDF</p>
        </div>
      </div>
    </div>
  );
}
