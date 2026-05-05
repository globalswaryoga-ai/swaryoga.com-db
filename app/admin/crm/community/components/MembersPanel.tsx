'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Download, Mail, Shield, Send, Loader, CheckCircle, AlertCircle, Trash2, Users, Search } from 'lucide-react';

interface CommunityMember {
  _id: string;
  userId?: string;
  name: string;
  email?: string;
  mobile: string;
  country?: string;
  communityName: string;
  joinedAt: string;
  status: 'active' | 'inactive' | 'banned';
  approved?: boolean;
  approvedAt?: string;
  messageCount: number;
  reactions: number;
  chatEnabled?: boolean;
  metadata?: {
    requestMessage?: string;
    workshopsCompleted?: boolean;
    requestId?: string;
  };
}

interface MembersPanelProps {
  members: CommunityMember[];
  loading: boolean;
  token: string | null;
  selectedCommunity: string;
  activeTab: string;
  onShowBulkInvite: () => void;
  onShowAddMember: () => void;
  onShowMessage: (member: CommunityMember) => void;
  onOpenChatPermissions: (member: CommunityMember) => void;
  onApproveMember: (memberId: string) => Promise<void>;
  onBlockMember: (memberId: string, userId: string, memberName: string) => Promise<void>;
  onUnblockMember: (memberId: string, userId: string, memberName: string) => Promise<void>;
  pendingMembers: number;
  lastActivityTime: string;
}

export const MembersPanel: React.FC<MembersPanelProps> = ({
  members,
  loading,
  token,
  selectedCommunity,
  activeTab,
  onShowBulkInvite,
  onShowAddMember,
  onShowMessage,
  onOpenChatPermissions,
  onApproveMember,
  onBlockMember,
  onUnblockMember,
  pendingMembers,
  lastActivityTime,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned' | 'pending'>('all');
  const [approving, setApproving] = useState<string | null>(null);
  const [blockingMemberId, setBlockingMemberId] = useState<string | null>(null);

  // Memoize filtered members - only recalculate when members or filters change
  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(m => !m.approved);
      } else {
        filtered = filtered.filter(m => m.status === statusFilter);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.mobile.includes(query) ||
        m.userId?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [members, statusFilter, searchQuery]);

  // Memoize handlers to prevent re-renders in child components
  const handleApproveMember = useCallback(
    async (memberId: string) => {
      setApproving(memberId);
      try {
        await onApproveMember(memberId);
      } finally {
        setApproving(null);
      }
    },
    [onApproveMember]
  );

  const handleBlockMember = useCallback(
    async (memberId: string, userId: string, memberName: string) => {
      setBlockingMemberId(memberId);
      try {
        await onBlockMember(memberId, userId, memberName);
      } finally {
        setBlockingMemberId(null);
      }
    },
    [onBlockMember]
  );

  const handleUnblockMember = useCallback(
    async (memberId: string, userId: string, memberName: string) => {
      setBlockingMemberId(memberId);
      try {
        await onUnblockMember(memberId, userId, memberName);
      } finally {
        setBlockingMemberId(null);
      }
    },
    [onUnblockMember]
  );

  const handleExportCSV = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/community/export?communityId=${selectedCommunity}&format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `community-members-${selectedCommunity}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('❌ Export failed: ' + e.message);
    }
  }, [selectedCommunity, token]);

  // Only render if members tab is active
  if (activeTab !== 'members') return null;

  return (
    <>
      {/* Members Search and Filter */}
      <div className="flex gap-5 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search registry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-7 h-14 bg-slate-50/50 text-slate-900 rounded-2xl border border-slate-200/60 font-medium text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-6 h-14 bg-white text-slate-700 rounded-2xl border border-slate-200/60 font-bold text-xs uppercase cursor-pointer min-w-[160px]"
        >
          <option value="all">Display All</option>
          <option value="pending">Pending Approval</option>
          <option value="active">Verified members</option>
          <option value="inactive">Waitlist</option>
        </select>
        {/* Export Members Button */}
        <button
          onClick={handleExportCSV}
          className="h-14 px-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200 font-bold text-xs uppercase flex items-center gap-2 transition-all"
          title="Export members to CSV"
        >
          <Download size={16} /> Export CSV
        </button>
        {/* Bulk Invite Button */}
        <button
          onClick={onShowBulkInvite}
          className="h-14 px-5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl border border-purple-200 font-bold text-xs uppercase flex items-center gap-2 transition-all"
          title="Send bulk invite to old participants"
        >
          <Mail size={16} /> Bulk Invite
        </button>
      </div>

      {/* Members Tab Content */}
      <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-80 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-200/60 h-[400px] flex flex-col items-center justify-center text-center p-20 shadow-sm">
            <Users size={48} className="text-slate-200 mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Registry Empty</h3>
            <p className="text-slate-500 text-sm mb-8">No matching records found in this portfolio.</p>
            <button
              onClick={onShowAddMember}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-indigo-600/20"
            >
              Add Person
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200/60 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#fcfdfe] border-b border-slate-100 text-left">
                <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <th className="pl-10 px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Connectivity</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Interaction</th>
                  <th className="pr-10 px-4 py-3 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-indigo-50/[0.15] group transition-all">
                    <td className="pl-10 px-4 py-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm uppercase tracking-tight leading-none">
                            {member.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                            ID: {member.userId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-600">{member.mobile}</span>
                        {member.country && (
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                            {member.country}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 cursor-pointer group/approve">
                        <input
                          type="checkbox"
                          checked={!!member.approved}
                          onChange={() => {
                            if (!member.approved) {
                              handleApproveMember(member._id);
                            }
                          }}
                          disabled={!!member.approved || approving === member._id}
                          className="w-5 h-5 rounded border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-default accent-emerald-600"
                        />
                        {approving === member._id ? (
                          <Loader size={14} className="animate-spin text-emerald-500" />
                        ) : member.approved ? (
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">Approved</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-600 uppercase">Pending</span>
                        )}
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest inline-block w-fit ${
                            member.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : member.status === 'banned'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          {member.status}
                        </span>
                        {!member.approved && (
                          <>
                            {member.metadata?.requestMessage && (
                              <p
                                className="text-[9px] text-slate-500 italic max-w-[150px] truncate"
                                title={member.metadata.requestMessage}
                              >
                                &quot;{member.metadata.requestMessage}&quot;
                              </p>
                            )}
                            {member.metadata?.workshopsCompleted && (
                              <span className="text-[8px] font-bold text-emerald-600 uppercase">
                                ✓ Workshops Done
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-4">
                        <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-center min-w-[40px]">
                          <p className="text-xs font-bold text-slate-800">{member.messageCount}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Posts</p>
                        </div>
                      </div>
                    </td>
                    <td className="pr-10 px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-all">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onOpenChatPermissions(member)}
                          className="p-2 hover:bg-slate-900 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100"
                          title="Chat Permissions"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => onShowMessage(member)}
                          className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100"
                          title="Send Message"
                        >
                          <Send size={16} />
                        </button>
                        {member.status === 'banned' ? (
                          <button
                            onClick={() =>
                              handleUnblockMember(member._id, member.userId || '', member.name)
                            }
                            disabled={blockingMemberId === member._id}
                            className="p-2 hover:bg-emerald-500 hover:text-white rounded-lg transition-all text-emerald-600 border border-emerald-100 bg-emerald-50 disabled:opacity-50"
                            title="Unblock Member"
                          >
                            {blockingMemberId === member._id ? (
                              <Loader size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleBlockMember(member._id, member.userId || '', member.name)
                            }
                            disabled={blockingMemberId === member._id}
                            className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all text-red-400 border border-red-100 disabled:opacity-50"
                            title="Block Member"
                          >
                            {blockingMemberId === member._id ? (
                              <Loader size={16} className="animate-spin" />
                            ) : (
                              <AlertCircle size={16} />
                            )}
                          </button>
                        )}
                        <button
                          className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100"
                          title="Delete Member"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
