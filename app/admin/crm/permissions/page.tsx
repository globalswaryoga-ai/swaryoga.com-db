'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  DataTable,
  PageHeader,
  LoadingSpinner,
  AlertBox,
} from '@/components/admin/crm';

type Channel = 'whatsapp' | 'sms' | 'email';
type ConsentStatus = 'opted_in' | 'opted_out' | 'pending';

interface ConsentRecord {
  _id: string;
  leadId?: string;
  phoneNumber: string;
  channel: Channel;
  status: ConsentStatus;
  consentMethod?: string;
  consentDate?: string;
  optOutDate?: string;
  optOutReason?: string;
  optOutKeyword?: string;
  blockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConsentPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ConsentStatus>('all');
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    channel: 'whatsapp' as Channel,
    status: 'pending' as ConsentStatus,
    consentMethod: 'manual',
  });
  const [page, setPage] = useState(1);
  const [totalConsents, setTotalConsents] = useState(0);

  const pageSize = 20;

  const fetchConsents = useCallback(async () => {
    try {
      const result = await crm.fetch('/api/admin/crm/consent', {
        params: {
          limit: pageSize,
          skip: (page - 1) * pageSize,
          channel: channelFilter === 'all' ? undefined : channelFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      });

      setConsents(result?.consents || []);
      setTotalConsents(result?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [channelFilter, crm, page, pageSize, statusFilter]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchConsents();
  }, [token, router, fetchConsents]);

  const handleCreateConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crm.fetch('/api/admin/crm/consent', {
        method: 'POST',
        body: {
          phoneNumber: formData.phoneNumber,
          channel: formData.channel,
          status: formData.status,
          consentMethod: formData.consentMethod,
        },
      });

      setShowCreateModal(false);
      setFormData({ phoneNumber: '', channel: 'whatsapp', status: 'pending', consentMethod: 'manual' });
      setPage(1);
      fetchConsents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create consent');
    }
  };

  const handleUpdateConsent = async (consentId: string, newStatus: ConsentStatus) => {
    try {
      await crm.fetch('/api/admin/crm/consent', {
        method: 'PUT',
        body:
          newStatus === 'opted_in'
            ? { consentId, action: 'opt-in' }
            : newStatus === 'opted_out'
              ? { consentId, action: 'opt-out' }
              : { consentId, status: 'pending' },
      });

      fetchConsents();
      if (selectedConsent?._id === consentId) {
        setSelectedConsent(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDeleteConsent = async (consentId: string) => {
    if (!confirm('Delete this consent record?')) return;
    try {
      await crm.fetch('/api/admin/crm/consent', {
        method: 'DELETE',
        params: { consentId },
      });
      fetchConsents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'opted_in') return 'bg-green-500/20 text-green-200 border-green-500/30';
    if (status === 'opted_out') return 'bg-red-500/20 text-red-200 border-red-500/30';
    return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
  };

  const getChannelColor = (channel: string) => {
    const colors: Record<string, string> = {
      whatsapp: 'bg-green-500/20 text-green-200',
      sms: 'bg-purple-500/20 text-purple-200',
      email: 'bg-cyan-500/20 text-cyan-200',
    };
    return colors[channel] || colors.whatsapp;
  };

  const columns = [
    {
      key: 'phoneNumber',
      label: 'Phone',
      render: (phone: string) => <span className="font-mono">{phone}</span>,
    },
    {
      key: 'channel',
      label: 'Channel',
      render: (channel: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getChannelColor(channel)}`}>
          {channel}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: string) => (
        <span className={`px-3 py-1 rounded-lg text-sm font-medium border inline-flex items-center gap-2 ${getStatusColor(status)}`}>
          {status === 'opted_in' ? '✓' : status === 'opted_out' ? '✗' : '…'} {status}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, consent: ConsentRecord) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedConsent(consent)}
            className="px-3 py-1 bg-blue-500/20 text-blue-200 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
          >
            View
          </button>
          <button
            onClick={() => handleDeleteConsent(consent._id)}
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
          title="Consent Management"
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
            >
              + Grant Consent
            </button>
          }
        />

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-purple-200 text-sm mb-2">Filter by Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-purple-200 text-sm mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="opted_in">Opted In</option>
              <option value="opted_out">Opted Out</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {crm.loading ? (
          <LoadingSpinner />
        ) : error ? (
          <AlertBox type="error" message={error} onClose={() => setError(null)} />
        ) : (
          <div className="space-y-6">
            {/* Data Table */}
            <DataTable
              columns={columns}
              data={consents}
              emptyMessage="No consent records found"
            />

            {/* Pagination */}
            {totalConsents > 0 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg disabled:opacity-50 hover:bg-purple-500/30 transition-colors"
                >
                  Previous
                </button>
                <div className="text-purple-200 text-sm">
                  Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalConsents)} of {totalConsents}
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalConsents}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg disabled:opacity-50 hover:bg-purple-500/30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Consent Detail Modal */}
        {selectedConsent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl border border-purple-500/50 p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Consent Details</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Phone</label>
                  <div className="text-white font-mono">{selectedConsent.phoneNumber}</div>
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Channel</label>
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${getChannelColor(selectedConsent.channel)}`}>
                    {selectedConsent.channel}
                  </span>
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(selectedConsent.status)}`}>
                    {selectedConsent.status === 'opted_in' ? '✓' : selectedConsent.status === 'opted_out' ? '✗' : '…'} {selectedConsent.status}
                  </span>
                </div>
                {selectedConsent.optOutDate && (
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Opt Out Date</label>
                    <div className="text-white">{new Date(selectedConsent.optOutDate).toLocaleString()}</div>
                  </div>
                )}
                {selectedConsent.blockedUntil && (
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Blocked Until</label>
                    <div className="text-white">{new Date(selectedConsent.blockedUntil).toLocaleString()}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Created</label>
                    <div className="text-white text-sm">{new Date(selectedConsent.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Updated</label>
                    <div className="text-white text-sm">{new Date(selectedConsent.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {selectedConsent.status !== 'opted_in' && (
                  <button
                    onClick={() => {
                      handleUpdateConsent(selectedConsent._id, 'opted_in');
                    }}
                    className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg transition-colors"
                  >
                    Opt In
                  </button>
                )}
                {selectedConsent.status !== 'opted_out' && (
                  <button
                    onClick={() => {
                      handleUpdateConsent(selectedConsent._id, 'opted_out');
                    }}
                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
                  >
                    Opt Out
                  </button>
                )}
                {selectedConsent.status !== 'pending' && (
                  <button
                    onClick={() => {
                      handleUpdateConsent(selectedConsent._id, 'pending');
                    }}
                    className="flex-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 rounded-lg transition-colors"
                  >
                    Set Pending
                  </button>
                )}
                <button
                  onClick={() => handleDeleteConsent(selectedConsent._id)}
                  className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
                >
                  Delete Record
                </button>
                <button
                  onClick={() => setSelectedConsent(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Consent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl border border-purple-500/50 p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Create Consent</h2>
              <form onSubmit={handleCreateConsent} className="space-y-4">
                <div>
                  <label className="block text-purple-200 text-sm mb-2">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm mb-2">Channel</label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value as Channel })}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-purple-200 text-sm mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ConsentStatus })}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="opted_in">Opted In</option>
                    <option value="opted_out">Opted Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-purple-200 text-sm mb-2">Consent Method</label>
                  <input
                    type="text"
                    value={formData.consentMethod}
                    onChange={(e) => setFormData({ ...formData, consentMethod: e.target.value })}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="manual"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
