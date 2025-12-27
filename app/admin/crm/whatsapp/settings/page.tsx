'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner, AlertBox } from '@/components/admin/crm';

type WhatsAppAccount = {
  _id: string;
  accountName: string;
  accountType: 'common' | 'meta';
  commonProvider?: string;
  commonPhoneNumber?: string;
  metaPhoneNumber?: string;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  healthStatus: 'healthy' | 'degraded' | 'down';
  isDefault: boolean;
  isActive: boolean;
  totalMessagesSent: number;
  dailyMessagesSent: number;
  dailyMessageLimit: number;
  lastMessageSentAt?: string;
  createdAt: string;
};

function SettingsContent() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: 'common' as 'common' | 'meta',
    commonProvider: 'twilio',
    commonPhoneNumber: '',
    commonProviderId: '',
    commonApiKey: '',
    commonApiSecret: '',
    metaPhoneNumberId: '',
    metaPhoneNumber: '',
    metaBusinessAccountId: '',
    metaAccessToken: '',
    metaVerifyToken: '',
    isDefault: false,
    isActive: true,
  });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmFetch('/api/admin/crm/whatsapp-accounts', {
        params: { limit: 100, skip: 0 },
      });
      setAccounts(Array.isArray(res?.data?.accounts) ? res.data.accounts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [crmFetch]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchAccounts();
  }, [token, router, fetchAccounts]);

  const resetForm = () => {
    setFormData({
      accountName: '',
      accountType: 'common',
      commonProvider: 'twilio',
      commonPhoneNumber: '',
      commonProviderId: '',
      commonApiKey: '',
      commonApiSecret: '',
      metaPhoneNumberId: '',
      metaPhoneNumber: '',
      metaBusinessAccountId: '',
      metaAccessToken: '',
      metaVerifyToken: '',
      isDefault: false,
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const saveAccount = async () => {
    if (!formData.accountName) {
      setError('Account name is required');
      return;
    }

    if (formData.accountType === 'common' && !formData.commonPhoneNumber) {
      setError('Phone number is required for common gateway');
      return;
    }

    if (formData.accountType === 'meta' && !formData.metaPhoneNumber) {
      setError('Phone number is required for Meta account');
      return;
    }

    try {
      if (editingId) {
        await crmFetch(`/api/admin/crm/whatsapp-accounts/${editingId}`, {
          method: 'PUT',
          body: formData,
        });
        setSuccess('Account updated successfully!');
      } else {
        await crmFetch('/api/admin/crm/whatsapp-accounts', {
          method: 'POST',
          body: formData,
        });
        setSuccess('Account created successfully!');
      }
      setTimeout(() => setSuccess(null), 3000);
      await fetchAccounts();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    }
  };

  const deleteAccount = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    try {
      await crmFetch(`/api/admin/crm/whatsapp-accounts/${id}`, {
        method: 'DELETE',
      });
      setSuccess('Account deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const healthCheck = async (id: string) => {
    try {
      await crmFetch(`/api/admin/crm/whatsapp-accounts/${id}/health-check`, {
        method: 'POST',
      });
      setSuccess('Health check completed!');
      setTimeout(() => setSuccess(null), 2000);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await crmFetch(`/api/admin/crm/whatsapp-accounts/${id}`, {
        method: 'PUT',
        body: { isActive: !currentStatus },
      });
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      await crmFetch(`/api/admin/crm/whatsapp-accounts/${id}`, {
        method: 'PUT',
        body: { isDefault: true },
      });
      setSuccess('Default account set!');
      setTimeout(() => setSuccess(null), 2000);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
  };

  const openEdit = (account: WhatsAppAccount) => {
    setFormData({
      accountName: account.accountName,
      accountType: account.accountType,
      commonProvider: account.commonProvider || 'twilio',
      commonPhoneNumber: account.commonPhoneNumber || '',
      commonProviderId: '',
      commonApiKey: '',
      commonApiSecret: '',
      metaPhoneNumberId: (account as any).metaPhoneNumberId || '',
      metaPhoneNumber: account.metaPhoneNumber || '',
      metaBusinessAccountId: '',
      metaAccessToken: '',
      metaVerifyToken: '',
      isDefault: account.isDefault,
      isActive: account.isActive,
    });
    setEditingId(account._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/admin/crm/whatsapp"
                className="text-[#1E7F43] hover:text-[#166235] font-semibold transition-colors"
              >
                ← WhatsApp
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Accounts</h1>
            <p className="text-gray-600 mt-1">Connect your WhatsApp numbers for sending messages</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/crm/whatsapp/qr-login"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              🔲 QR Code Login
            </Link>
            <button
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
              className="px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
            >
              {showForm ? '✕ Cancel' : '+ Add Account'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-md mb-8 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingId ? 'Edit Account' : 'Create New Account'}
            </h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="e.g., Support Team, Sales, Marketing"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Account Type *
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      accountType: e.target.value as 'common' | 'meta',
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                >
                  <option value="common">📞 Common Gateway (Twilio, MSG91, etc.)</option>
                  <option value="meta">💬 Meta WhatsApp Business API</option>
                </select>
              </div>
            </div>

            {/* Common Gateway Fields */}
            {formData.accountType === 'common' && (
              <div className="space-y-6 mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-4">📞 Common Gateway Configuration</h3>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Provider *
                    </label>
                    <select
                      value={formData.commonProvider}
                      onChange={(e) =>
                        setFormData({ ...formData, commonProvider: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    >
                      <option value="twilio">Twilio</option>
                      <option value="msg91">MSG91</option>
                      <option value="vonage">Vonage</option>
                      <option value="aws_sns">AWS SNS</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.commonPhoneNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, commonPhoneNumber: e.target.value })
                      }
                      placeholder="+919876543210"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Provider Account ID
                    </label>
                    <input
                      type="text"
                      value={formData.commonProviderId}
                      onChange={(e) =>
                        setFormData({ ...formData, commonProviderId: e.target.value })
                      }
                      placeholder="e.g., AC1234567890abcdef"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.commonApiKey}
                      onChange={(e) => setFormData({ ...formData, commonApiKey: e.target.value })}
                      placeholder="Your API key"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={formData.commonApiSecret}
                    onChange={(e) =>
                      setFormData({ ...formData, commonApiSecret: e.target.value })
                    }
                    placeholder="Your API secret"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Meta Gateway Fields */}
            {formData.accountType === 'meta' && (
              <div className="space-y-6 mb-6 p-6 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-4">💬 Meta WhatsApp Business API</h3>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.metaPhoneNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, metaPhoneNumber: e.target.value })
                      }
                      placeholder="+919876543210"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={formData.metaPhoneNumberId}
                      onChange={(e) =>
                        setFormData({ ...formData, metaPhoneNumberId: e.target.value })
                      }
                      placeholder="Meta phone_number_id"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Business Account ID
                    </label>
                    <input
                      type="text"
                      value={formData.metaBusinessAccountId}
                      onChange={(e) =>
                        setFormData({ ...formData, metaBusinessAccountId: e.target.value })
                      }
                      placeholder="Your WABA ID"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Verify Token
                    </label>
                    <input
                      type="password"
                      value={formData.metaVerifyToken}
                      onChange={(e) =>
                        setFormData({ ...formData, metaVerifyToken: e.target.value })
                      }
                      placeholder="Webhook verify token"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={formData.metaAccessToken}
                    onChange={(e) =>
                      setFormData({ ...formData, metaAccessToken: e.target.value })
                    }
                    placeholder="Your Meta API access token"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Common Options */}
            <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-100 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#1E7F43] cursor-pointer"
                />
                <span className="font-semibold text-gray-900">Set as Default</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#1E7F43] cursor-pointer"
                />
                <span className="font-semibold text-gray-900">Active</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={resetForm}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAccount}
                className="flex-1 px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
              >
                {editingId ? 'Update Account' : 'Create Account'}
              </button>
            </div>
          </div>
        )}

        {/* Accounts List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="text-6xl mb-4">📱</div>
            <p className="text-gray-600 text-lg mb-6">No accounts connected yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
            >
              Add Your First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {accounts.map((account) => (
              <div
                key={account._id}
                className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{account.accountName}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {account.accountType === 'meta' ? '💬 Meta WhatsApp API' : '📞 Common Gateway'}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ml-2 ${
                        account.healthStatus === 'healthy'
                          ? 'bg-green-100 text-green-700'
                          : account.healthStatus === 'degraded'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {account.healthStatus === 'healthy' ? '✓ Healthy' : account.healthStatus === 'degraded' ? '⚠ Degraded' : '✕ Down'}
                    </span>
                  </div>

                  {/* Phone Number & Status */}
                  <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Phone</p>
                      <p className="text-sm font-mono text-gray-900">
                        {account.accountType === 'meta'
                          ? account.metaPhoneNumber
                          : account.commonPhoneNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          account.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {account.isActive ? '🟢 Active' : '⚪ Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#1E7F43]">{account.totalMessagesSent}</p>
                      <p className="text-xs text-gray-600 mt-1">Total Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#1E7F43]">{account.dailyMessagesSent}</p>
                      <p className="text-xs text-gray-600 mt-1">Today</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-700">
                        {account.dailyMessageLimit - account.dailyMessagesSent}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Remaining</p>
                    </div>
                  </div>

                  {/* Default Badge */}
                  {account.isDefault && (
                    <div className="mb-4 p-3 bg-[#E6F4EC] border border-[#1E7F43] rounded-lg">
                      <p className="text-sm font-semibold text-[#1E7F43]">⭐ Default Account</p>
                    </div>
                  )}

                  {/* Last Message */}
                  {account.lastMessageSentAt && (
                    <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                      <p className="text-xs text-gray-600">Last Message</p>
                      <p className="text-sm text-gray-700 font-semibold">
                        {new Date(account.lastMessageSentAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openEdit(account)}
                        className="px-3 py-2 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => healthCheck(account._id)}
                        className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-semibold text-sm transition-colors"
                      >
                        🏥 Check
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleActive(account._id, account.isActive)}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                          account.isActive
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                      >
                        {account.isActive ? '⏸ Disable' : '▶ Enable'}
                      </button>
                      {!account.isDefault && (
                        <button
                          onClick={() => setAsDefault(account._id)}
                          className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold text-sm transition-colors"
                        >
                          ⭐ Default
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => deleteAccount(account._id, account.accountName)}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-bold text-gray-900 mb-3">📚 How to Connect WhatsApp</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-semibold text-gray-900 mb-1">📞 Common Gateway (Twilio, MSG91, etc.)</p>
              <p>Use third-party WhatsApp API providers. Get API credentials from your provider's dashboard and enter them here.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">💬 Meta WhatsApp Business API</p>
              <p>Register on Meta's Business Platform → Create WhatsApp Business Account → Get Access Token → Add credentials here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
