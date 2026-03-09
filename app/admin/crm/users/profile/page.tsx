'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface UserProfile {
  user: {
    _id: string;
    name: string;
    email: string;
    mobileNumber: string;
    profileId: string;
    country: string;
    state: string;
    createdAt: string;
  } | null;
  lead: {
    _id: string;
    leadNumber: string;
    name: string;
    phoneNumber: string;
    email: string;
    status: string;
    source: string;
    labels: string[];
    isLinkedToAccount: boolean;
    linkedProfileId: string;
    createdAt: string;
  } | null;
  orders: Array<{
    _id: string;
    workshopName: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  contacts: Array<{
    _id: string;
    subject: string;
    message: string;
    source: string;
    status: string;
    createdAt: string;
  }>;
  whatsappMessages: Array<{
    _id: string;
    body: string;
    from: string;
    to: string;
    direction: string;
    createdAt: string;
  }>;
  communityMemberships: Array<{
    _id: string;
    communityId: string;
    status: string;
    role: string;
  }>;
  communityPosts: Array<{
    _id: string;
    content: string;
    createdAt: string;
  }>;
  devices: Array<{
    _id: string;
    deviceName: string;
    deviceType: string;
    location: { city: string; state: string };
    lastActive: string;
    isBlocked: boolean;
  }>;
  violations: Array<{
    _id: string;
    violationType: string;
    severity: string;
    createdAt: string;
    isReviewed: boolean;
  }>;
  summary: {
    hasAccount: boolean;
    hasLead: boolean;
    totalOrders: number;
    totalContacts: number;
    totalMessages: number;
    totalDevices: number;
    totalViolations: number;
    isLinked: boolean;
  };
}

export default function UnifiedProfilePage() {
  const [searchType, setSearchType] = useState<'phone' | 'email' | 'profileId' | 'leadId'>('phone');
  const [searchValue, setSearchValue] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'orders' | 'contacts' | 'devices'>('overview');

  const fetchProfile = useCallback(async () => {
    if (!searchValue.trim()) {
      setError('Please enter a search value');
      return;
    }

    setLoading(true);
    setError('');
    setProfile(null);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/unified-profile?${searchType}=${encodeURIComponent(searchValue)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch profile');
        return;
      }

      if (!data.data?.user && !data.data?.lead) {
        setError('No user or lead found with this information');
        return;
      }

      setProfile(data.data);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [searchType, searchValue]);

  const handleLink = async () => {
    if (!profile?.lead || !profile?.user) {
      alert('Need both user account and lead to link');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await fetch('/api/admin/unified-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'link',
          leadId: profile.lead._id,
          userId: profile.user._id,
        }),
      });
      fetchProfile();
    } catch (err) {
      console.error('Link error:', err);
    }
  };

  const handleAutoLink = async () => {
    if (!confirm('This will auto-link all leads to user accounts based on phone/email match. Continue?')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/unified-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'auto-link' }),
      });
      const data = await res.json();
      alert(data.data?.message || 'Auto-link completed');
    } catch (err) {
      console.error('Auto-link error:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">👤 Unified User Profile</h1>
              <p className="text-sm text-gray-500">View all user data across all touchpoints</p>
            </div>
            <button
              onClick={handleAutoLink}
              className="rounded-lg bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
            >
              🔗 Auto-Link All
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-wrap gap-4">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as typeof searchType)}
              className="rounded-lg border px-4 py-2"
            >
              <option value="phone">📱 Phone Number</option>
              <option value="email">📧 Email</option>
              <option value="profileId">🆔 Profile ID (6-digit)</option>
              <option value="leadId">📋 Lead ID</option>
            </select>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={
                searchType === 'phone' ? 'Enter phone number...' :
                searchType === 'email' ? 'Enter email...' :
                searchType === 'profileId' ? 'Enter 6-digit profile ID...' :
                'Enter lead ID...'
              }
              className="flex-1 rounded-lg border px-4 py-2"
              onKeyDown={(e) => e.key === 'Enter' && fetchProfile()}
            />
            <button
              onClick={fetchProfile}
              disabled={loading}
              className="rounded-lg bg-indigo-500 px-6 py-2 text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
          </div>
          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>
      </div>

      {/* Profile Content */}
      {profile && (
        <div className="mx-auto max-w-7xl px-4 pb-8">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
            <div className={`rounded-lg p-4 shadow ${profile.summary.hasAccount ? 'bg-green-50' : 'bg-gray-50'}`}>
              <p className="text-2xl">{profile.summary.hasAccount ? '✅' : '❌'}</p>
              <p className="text-sm text-gray-600">Account</p>
            </div>
            <div className={`rounded-lg p-4 shadow ${profile.summary.hasLead ? 'bg-green-50' : 'bg-gray-50'}`}>
              <p className="text-2xl">{profile.summary.hasLead ? '✅' : '❌'}</p>
              <p className="text-sm text-gray-600">CRM Lead</p>
            </div>
            <div className={`rounded-lg p-4 shadow ${profile.summary.isLinked ? 'bg-indigo-50' : 'bg-yellow-50'}`}>
              <p className="text-2xl">{profile.summary.isLinked ? '🔗' : '⚠️'}</p>
              <p className="text-sm text-gray-600">{profile.summary.isLinked ? 'Linked' : 'Not Linked'}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-indigo-600">{profile.summary.totalOrders}</p>
              <p className="text-sm text-gray-600">Orders</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-green-600">{profile.summary.totalMessages}</p>
              <p className="text-sm text-gray-600">WhatsApp</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-purple-600">{profile.summary.totalDevices}</p>
              <p className="text-sm text-gray-600">Devices</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-red-600">{profile.summary.totalViolations}</p>
              <p className="text-sm text-gray-600">Violations</p>
            </div>
          </div>

          {/* Link Button */}
          {profile.user && profile.lead && !profile.summary.isLinked && (
            <div className="mb-6 rounded-lg bg-yellow-50 p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-800">⚠️ User account and Lead are not linked</p>
                  <p className="text-sm text-yellow-600">Link them for unified tracking</p>
                </div>
                <button
                  onClick={handleLink}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
                >
                  🔗 Link Now
                </button>
              </div>
            </div>
          )}

          {/* Main Profile Cards */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* User Account */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-medium">
                <span>👤</span> User Account
                {profile.user?.profileId && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-sm text-indigo-700">
                    ID: {profile.user.profileId}
                  </span>
                )}
              </h3>
              {profile.user ? (
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {profile.user.name}</p>
                  <p><strong>Email:</strong> {profile.user.email}</p>
                  <p><strong>Phone:</strong> {profile.user.mobileNumber}</p>
                  <p><strong>Location:</strong> {profile.user.state}, {profile.user.country}</p>
                  <p><strong>Registered:</strong> {formatDate(profile.user.createdAt)}</p>
                </div>
              ) : (
                <p className="text-gray-500">No account found</p>
              )}
            </div>

            {/* CRM Lead */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-medium">
                <span>📋</span> CRM Lead
                {profile.lead?.leadNumber && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-700">
                    #{profile.lead.leadNumber}
                  </span>
                )}
              </h3>
              {profile.lead ? (
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {profile.lead.name}</p>
                  <p><strong>Phone:</strong> {profile.lead.phoneNumber}</p>
                  <p><strong>Email:</strong> {profile.lead.email || '-'}</p>
                  <p><strong>Status:</strong> 
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                      profile.lead.status === 'customer' ? 'bg-green-100 text-green-700' :
                      profile.lead.status === 'prospect' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {profile.lead.status}
                    </span>
                  </p>
                  <p><strong>Source:</strong> {profile.lead.source}</p>
                  <p><strong>Labels:</strong> {profile.lead.labels?.join(', ') || '-'}</p>
                  <p><strong>Created:</strong> {formatDate(profile.lead.createdAt)}</p>
                  <Link
                    href={`/admin/crm/leads/${profile.lead._id}`}
                    className="mt-2 inline-block text-indigo-500 hover:underline"
                  >
                    View in CRM →
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500">No lead found</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-2 border-b">
            {['overview', 'messages', 'orders', 'contacts', 'devices'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-4 py-2 capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="rounded-lg bg-white p-6 shadow">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Community Memberships */}
                <div>
                  <h4 className="mb-2 font-medium">🌍 Community Memberships</h4>
                  {profile.communityMemberships.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.communityMemberships.map((m) => (
                        <span key={m._id} className="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700">
                          {m.communityId} ({m.role})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No community memberships</p>
                  )}
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="mb-2 font-medium">📝 Recent Posts</h4>
                  {profile.communityPosts.length > 0 ? (
                    <div className="space-y-2">
                      {profile.communityPosts.slice(0, 3).map((p) => (
                        <div key={p._id} className="rounded bg-gray-50 p-2 text-sm">
                          <p className="line-clamp-2">{p.content}</p>
                          <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No posts</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div>
                <h4 className="mb-4 font-medium">💬 WhatsApp Messages ({profile.whatsappMessages.length})</h4>
                {profile.whatsappMessages.length > 0 ? (
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {profile.whatsappMessages.map((m) => (
                      <div
                        key={m._id}
                        className={`rounded p-2 text-sm ${
                          m.direction === 'inbound' ? 'bg-gray-100' : 'bg-indigo-50'
                        }`}
                      >
                        <p className="text-xs text-gray-500">
                          {m.direction === 'inbound' ? '← Received' : '→ Sent'} • {formatDate(m.createdAt)}
                        </p>
                        <p className="mt-1">{m.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No WhatsApp messages</p>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h4 className="mb-4 font-medium">🛒 Orders ({profile.orders.length})</h4>
                {profile.orders.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Workshop</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.orders.map((o) => (
                        <tr key={o._id} className="border-b">
                          <td className="px-4 py-2">{o.workshopName || '-'}</td>
                          <td className="px-4 py-2">₹{o.amount}</td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${
                              o.status === 'completed' ? 'bg-green-100 text-green-700' :
                              o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">{formatDate(o.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500">No orders</p>
                )}
              </div>
            )}

            {activeTab === 'contacts' && (
              <div>
                <h4 className="mb-4 font-medium">📩 Contact Form Submissions ({profile.contacts.length})</h4>
                {profile.contacts.length > 0 ? (
                  <div className="space-y-3">
                    {profile.contacts.map((c) => (
                      <div key={c._id} className="rounded border p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{c.subject}</p>
                          <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{c.message}</p>
                        <div className="mt-2 flex gap-2">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{c.source}</span>
                          <span className={`rounded px-2 py-0.5 text-xs ${
                            c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No contact form submissions</p>
                )}
              </div>
            )}

            {activeTab === 'devices' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-medium">📱 Devices ({profile.devices.length})</h4>
                  {profile.user && (
                    <Link
                      href={`/admin/crm/devices?userId=${profile.user._id}`}
                      className="text-sm text-indigo-500 hover:underline"
                    >
                      Manage Devices →
                    </Link>
                  )}
                </div>
                
                {profile.devices.length > 0 ? (
                  <div className="space-y-3">
                    {profile.devices.map((d) => (
                      <div key={d._id} className={`rounded border p-3 ${d.isBlocked ? 'bg-red-50' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {d.deviceType === 'mobile' ? '📱' : d.deviceType === 'tablet' ? '📲' : '💻'}
                            </span>
                            <div>
                              <p className="font-medium">{d.deviceName}</p>
                              <p className="text-xs text-gray-500">
                                📍 {d.location?.city}, {d.location?.state}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {d.isBlocked && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                                Blocked
                              </span>
                            )}
                            <p className="text-xs text-gray-500">Last: {formatDate(d.lastActive)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No devices registered</p>
                )}

                {/* Violations */}
                {profile.violations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-2 font-medium text-red-600">⚠️ Violations ({profile.violations.length})</h4>
                    <div className="space-y-2">
                      {profile.violations.slice(0, 5).map((v) => (
                        <div key={v._id} className="rounded bg-red-50 p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{v.violationType.replace('_', ' ')}</span>
                            <span className="text-xs text-gray-500">{formatDate(v.createdAt)}</span>
                          </div>
                          <div className="mt-1 flex gap-2">
                            <span className={`rounded px-2 py-0.5 text-xs ${
                              v.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                              v.severity === 'moderate' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {v.severity}
                            </span>
                            {v.isReviewed && (
                              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                Reviewed
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
