'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COMMUNITY_DESIGNS } from '@/lib/communityColorSystem';

interface Member {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
  country?: string;
  countryCode?: string;
  userId: string;
  communityId: string;
  communityName: string;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  status: string;
  joinedAt: string;
}

export default function AdminCommunityMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all' | 'active'>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null); // memberId being actioned
  const [bulkLoading, setBulkLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [showAllLinks, setShowAllLinks] = useState(false);

  // All non-global communities for the dropdown (global is auto-approved, no need)
  const communities = COMMUNITY_DESIGNS.filter(c => c.id !== 'global');

  const getToken = () => localStorage.getItem('token') || '';

  // Fetch pending counts for each community
  const fetchPendingCounts = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    const counts: Record<string, number> = {};
    await Promise.all(
      communities.map(async (c) => {
        try {
          const res = await fetch(
            `/api/admin/community/members?communityId=${c.id}&status=pending&limit=0`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            const data = await res.json();
            counts[c.id] = data.data?.total || 0;
          }
        } catch {}
      })
    );
    setPendingCounts(counts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!selectedCommunity) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = getToken();
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const res = await fetch(
        `/api/admin/community/members?communityId=${selectedCommunity}&status=${filterStatus}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setMembers(data.data?.members || []);
      } else {
        setError(data.error || 'Failed to fetch members');
      }
    } catch (err) {
      setError('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [selectedCommunity, filterStatus, router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchPendingCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMembers();
    setSelectedIds(new Set());
  }, [fetchMembers]);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const timeout = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timeout);
    }
  }, [successMsg]);

  // Approve a single member
  const approveMember = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/community/members/${memberId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Member approved successfully`);
        fetchMembers();
        fetchPendingCounts();
      } else {
        setError(data.error || 'Failed to approve');
      }
    } catch {
      setError('Failed to approve member');
    } finally {
      setActionLoading(null);
    }
  };

  // Remove a single member
  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    setActionLoading(memberId);
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/community/members?memberId=${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Member removed');
        fetchMembers();
        fetchPendingCounts();
      } else {
        setError(data.error || 'Failed to remove');
      }
    } catch {
      setError('Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk approve selected members
  const bulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);

    const token = getToken();
    let successCount = 0;

    for (const memberId of Array.from(selectedIds)) {
      try {
        const res = await fetch(`/api/admin/community/members/${memberId}/approve`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) successCount++;
      } catch {}
    }

    setSuccessMsg(`${successCount} member(s) approved`);
    setSelectedIds(new Set());
    fetchMembers();
    fetchPendingCounts();
    setBulkLoading(false);
  };

  // Bulk remove selected members
  const bulkRemove = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remove ${selectedIds.size} selected member(s)?`)) return;
    setBulkLoading(true);

    const token = getToken();
    let successCount = 0;

    for (const memberId of Array.from(selectedIds)) {
      try {
        const res = await fetch(`/api/admin/community/members?memberId=${memberId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) successCount++;
      } catch {}
    }

    setSuccessMsg(`${successCount} member(s) removed`);
    setSelectedIds(new Set());
    fetchMembers();
    fetchPendingCounts();
    setBulkLoading(false);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map(m => m._id)));
    }
  };

  // Filter by search
  const filteredMembers = members.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.name?.toLowerCase().includes(term) ||
      m.mobile?.includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.country?.toLowerCase().includes(term) ||
      m.userId?.includes(term)
    );
  });

  // Total pending across all communities
  const totalPending = Object.values(pendingCounts).reduce((sum, c) => sum + c, 0);

  // Copy join link
  const copyJoinLink = (communityId: string) => {
    const link = `${window.location.origin}/join/${communityId}`;
    navigator.clipboard.writeText(link);
    setSuccessMsg(`Join link copied: ${link}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Community Members</h1>
              {totalPending > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalPending} pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Success Message */}
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2 animate-in fade-in">
            ✅ {successMsg}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            ⚠️ {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Community Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-gray-700">Select Community</label>
            <button
              onClick={() => setShowAllLinks(!showAllLinks)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              {showAllLinks ? '✕ Close Links' : '🔗 All Join Links'}
            </button>
          </div>

          {/* All Join Links Panel */}
          {showAllLinks && (
            <div className="mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-800 mb-3">📋 Community Join Links (copy & share)</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {communities.map(c => {
                  const link = typeof window !== 'undefined' ? `${window.location.origin}/join/${c.id}` : `/join/${c.id}`;
                  return (
                    <div key={c.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100">
                      <span className="text-sm font-medium text-gray-800 whitespace-nowrap min-w-[160px]">{c.name}</span>
                      <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-gray-500 flex-1 truncate">{link}</code>
                      <button
                        onClick={() => copyJoinLink(c.id)}
                        className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 font-medium transition-colors whitespace-nowrap"
                      >
                        📋 Copy
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {communities.map(c => {
              const pending = pendingCounts[c.id] || 0;
              const isSelected = selectedCommunity === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCommunity(c.id)}
                  className={`relative text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-green-50 border-green-400 text-green-800 ring-2 ring-green-200'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="block truncate">{c.name}</span>
                  {pending > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Copy Join Link */}
          {selectedCommunity && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-gray-500">Share join link:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600 flex-1 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/join/${selectedCommunity}` : `/join/${selectedCommunity}`}
              </code>
              <button
                onClick={() => copyJoinLink(selectedCommunity)}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition-colors"
              >
                📋 Copy
              </button>
            </div>
          )}
        </div>

        {/* No community selected */}
        {!selectedCommunity && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">👆</div>
            <p className="font-medium">Select a community above to manage members</p>
          </div>
        )}

        {/* Members Section */}
        {selectedCommunity && (
          <>
            {/* Filters & Actions Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                  {(['pending', 'all', 'active'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === status
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'pending' ? '⏳ Pending' : status === 'active' ? '✅ Active' : '📋 All'}
                      {status === 'pending' && pendingCounts[selectedCommunity] ? ` (${pendingCounts[selectedCommunity]})` : ''}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search name, phone, country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <div className="mt-3 flex items-center gap-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={bulkApprove}
                    disabled={bulkLoading}
                    className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {bulkLoading ? '...' : '✅ Approve Selected'}
                  </button>
                  <button
                    onClick={bulkRemove}
                    disabled={bulkLoading}
                    className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {bulkLoading ? '...' : '🗑 Remove Selected'}
                  </button>
                </div>
              )}
            </div>

            {/* Members List */}
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full" />
                <p className="text-gray-400 mt-3 text-sm">Loading members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-4">{filterStatus === 'pending' ? '🎉' : '📭'}</div>
                <p className="font-medium">
                  {filterStatus === 'pending' ? 'No pending approvals!' : 'No members found'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_1fr_1fr_100px_120px_140px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                    />
                  </div>
                  <div>Name</div>
                  <div>Phone</div>
                  <div>Country</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>

                {/* Table Body */}
                {filteredMembers.map((member) => (
                  <div
                    key={member._id}
                    className={`grid grid-cols-[40px_1fr_1fr_100px_120px_140px] gap-2 px-4 py-3 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors ${
                      selectedIds.has(member._id) ? 'bg-green-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member._id)}
                        onChange={() => toggleSelect(member._id)}
                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                      />
                    </div>

                    {/* Name */}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                      {member.email && (
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                      )}
                      <p className="text-[10px] text-gray-300">ID: {member.userId}</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <p className="text-sm text-gray-700 font-mono">
                        {member.countryCode || ''} {member.mobile}
                      </p>
                      <p className="text-xs text-gray-400">
                        Joined {new Date(member.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Country */}
                    <div>
                      <span className="text-sm text-gray-600">{member.country || '-'}</span>
                    </div>

                    {/* Status */}
                    <div>
                      {member.approved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✅ Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                          ⏳ Pending
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {!member.approved && (
                        <button
                          onClick={() => approveMember(member._id)}
                          disabled={actionLoading === member._id}
                          className="px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          title="Approve"
                        >
                          {actionLoading === member._id ? '...' : '✓ Approve'}
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(member._id)}
                        disabled={actionLoading === member._id}
                        className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                        title="Remove"
                      >
                        {actionLoading === member._id ? '...' : '✕'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Member count footer */}
            {!loading && filteredMembers.length > 0 && (
              <div className="text-center py-3 text-xs text-gray-400">
                Showing {filteredMembers.length} member(s)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
