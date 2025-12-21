'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Consent {
  _id: string;
  userId: string;
  leadId: string;
  consentType: 'marketing' | 'sms' | 'email' | 'whatsapp' | 'call' | 'data_processing';
  status: 'granted' | 'withdrawn';
  grantedAt?: string;
  withdrawnAt?: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConsentPage() {
  const router = useRouter();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'granted' | 'withdrawn'>('all');
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    leadId: '',
    consentTypes: [] as string[],
    status: 'granted',
  });
  const [page, setPage] = useState(1);
  const [totalConsents, setTotalConsents] = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const pageSize = 20;

  const consentTypes = [
    { id: 'marketing', label: 'Marketing Communications', description: 'Receive marketing emails and promotions' },
    { id: 'sms', label: 'SMS Messages', description: 'Receive SMS notifications' },
    { id: 'email', label: 'Email Notifications', description: 'Receive email notifications' },
    { id: 'whatsapp', label: 'WhatsApp Messages', description: 'Receive WhatsApp messages' },
    { id: 'call', label: 'Phone Calls', description: 'Receive phone calls' },
    { id: 'data_processing', label: 'Data Processing', description: 'Allow data processing and analytics' },
  ];

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchConsents();
  }, [page, typeFilter, statusFilter, token, router]);

  const fetchConsents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        skip: ((page - 1) * pageSize).toString(),
      });

      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/crm/permissions?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch consents');

      const data = await response.json();
      if (data.success) {
        setConsents(data.data.permissions);
        setTotalConsents(data.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/crm/permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: formData.leadId,
          consentTypes: formData.consentTypes,
          status: formData.status,
        }),
      });

      if (!response.ok) throw new Error('Failed to create consent record');

      setShowCreateModal(false);
      setFormData({ leadId: '', consentTypes: [], status: 'granted' });
      setPage(1);
      fetchConsents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create consent');
    }
  };

  const handleUpdateConsent = async (consentId: string, newStatus: 'granted' | 'withdrawn') => {
    try {
      const response = await fetch(`/api/admin/crm/permissions/${consentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update consent');
      fetchConsents();
      if (selectedConsent?._id === consentId) {
        setSelectedConsent(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDeleteConsent = async (consentId: string) => {
    if (!confirm('Delete this consent record?')) return;
    try {
      const response = await fetch(`/api/admin/crm/permissions/${consentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete consent');
      fetchConsents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'granted'
      ? 'bg-green-500/20 text-green-200 border-green-500/30'
      : 'bg-red-500/20 text-red-200 border-red-500/30';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      marketing: 'bg-blue-500/20 text-blue-200',
      sms: 'bg-purple-500/20 text-purple-200',
      email: 'bg-cyan-500/20 text-cyan-200',
      whatsapp: 'bg-green-500/20 text-green-200',
      call: 'bg-orange-500/20 text-orange-200',
      data_processing: 'bg-pink-500/20 text-pink-200',
    };
    return colors[type] || colors.marketing;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-800/50 backdrop-blur border-b border-purple-500/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/admin/crm" className="text-purple-400 hover:text-purple-300">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">Consent Management</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
          >
            + Grant Consent
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-purple-200 text-sm mb-2">Filter by Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Types</option>
              {consentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
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
              <option value="granted">Granted</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-purple-300">Loading consent records...</div>
        ) : error ? (
          <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-red-200">
            Error: {error}
          </div>
        ) : (
          <>
            {/* Consents List */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-purple-500/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-purple-500/20 bg-slate-700/50">
                      <th className="px-6 py-4 text-left text-purple-200 font-semibold">Lead ID</th>
                      <th className="px-6 py-4 text-left text-purple-200 font-semibold">Type</th>
                      <th className="px-6 py-4 text-left text-purple-200 font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-purple-200 font-semibold">Date</th>
                      <th className="px-6 py-4 text-left text-purple-200 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-purple-300">
                          No consent records found
                        </td>
                      </tr>
                    ) : (
                      consents.map((consent) => (
                        <tr key={consent._id} className="border-b border-purple-500/10 hover:bg-purple-500/5">
                          <td className="px-6 py-4 text-purple-200 text-sm font-mono">{consent.leadId?.slice(-6) || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(consent.consentType)}`}>
                              {consent.consentType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-sm font-medium border inline-flex items-center gap-2 ${getStatusColor(consent.status)}`}>
                              {consent.status === 'granted' ? '✓' : '✗'} {consent.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-purple-200 text-sm">
                            {new Date(consent.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 flex gap-2">
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
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalConsents > 0 && (
              <div className="flex items-center justify-between mt-6">
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
          </>
        )}
      </main>

      {/* Consent Detail Modal */}
      {selectedConsent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-purple-500/50 p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Consent Details</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-purple-300 text-sm mb-1">Lead ID</label>
                <div className="text-white font-mono">{selectedConsent.leadId}</div>
              </div>
              <div>
                <label className="block text-purple-300 text-sm mb-1">Consent Type</label>
                <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${getTypeColor(selectedConsent.consentType)}`}>
                  {selectedConsent.consentType.replace('_', ' ')}
                </span>
              </div>
              <div>
                <label className="block text-purple-300 text-sm mb-1">Status</label>
                <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(selectedConsent.status)}`}>
                  {selectedConsent.status === 'granted' ? '✓' : '✗'} {selectedConsent.status}
                </span>
              </div>
              {selectedConsent.status === 'granted' && selectedConsent.grantedAt && (
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Granted At</label>
                  <div className="text-white">{new Date(selectedConsent.grantedAt).toLocaleString()}</div>
                </div>
              )}
              {selectedConsent.status === 'withdrawn' && selectedConsent.withdrawnAt && (
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Withdrawn At</label>
                  <div className="text-white">{new Date(selectedConsent.withdrawnAt).toLocaleString()}</div>
                </div>
              )}
              {selectedConsent.notes && (
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Notes</label>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-purple-200">
                    {selectedConsent.notes}
                  </div>
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
              {selectedConsent.status === 'granted' && (
                <button
                  onClick={() => {
                    handleUpdateConsent(selectedConsent._id, 'withdrawn');
                  }}
                  className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
                >
                  Withdraw Consent
                </button>
              )}
              {selectedConsent.status === 'withdrawn' && (
                <button
                  onClick={() => {
                    handleUpdateConsent(selectedConsent._id, 'granted');
                  }}
                  className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg transition-colors"
                >
                  Grant Consent
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
            <h2 className="text-2xl font-bold text-white mb-6">Grant Consent</h2>
            <form onSubmit={handleCreateConsent} className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Lead ID *</label>
                <input
                  type="text"
                  required
                  value={formData.leadId}
                  onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Enter lead ID"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Consent Types *</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {consentTypes.map((type) => (
                    <label key={type.id} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.consentTypes.includes(type.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              consentTypes: [...formData.consentTypes, type.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              consentTypes: formData.consentTypes.filter((t) => t !== type.id),
                            });
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-purple-200 text-sm font-medium">{type.label}</div>
                        <div className="text-purple-300 text-xs">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="granted">Granted</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
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
  );
}
