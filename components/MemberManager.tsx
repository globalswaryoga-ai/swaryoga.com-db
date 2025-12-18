'use client';

import React, { useState } from 'react';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinDate: string;
  role: 'member' | 'moderator' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  posts: number;
  engagement: number;
}

interface MemberManagerProps {
  members?: Member[];
  onRoleChange?: (memberId: string, newRole: string) => void;
  onStatusChange?: (memberId: string, newStatus: string) => void;
  onMessage?: (memberId: string) => void;
  onRemove?: (memberId: string) => void;
}

export default function MemberManager({
  members = [
    { id: '1', name: 'Priya Singh', email: 'priya@yoga.com', avatar: '👩', joinDate: '2024-01-15', role: 'member', status: 'active', posts: 23, engagement: 85 },
    { id: '2', name: 'Rajesh Kumar', email: 'rajesh@yoga.com', avatar: '👨', joinDate: '2023-12-01', role: 'moderator', status: 'active', posts: 45, engagement: 95 },
    { id: '3', name: 'Anjali Sharma', email: 'anjali@yoga.com', avatar: '👩', joinDate: '2024-02-10', role: 'member', status: 'active', posts: 8, engagement: 60 },
    { id: '4', name: 'Marcus Johnson', email: 'marcus@yoga.com', avatar: '👨', joinDate: '2024-01-05', role: 'member', status: 'inactive', posts: 2, engagement: 20 },
    { id: '5', name: 'Sara Chen', email: 'sara@yoga.com', avatar: '👩', joinDate: '2023-11-20', role: 'admin', status: 'active', posts: 67, engagement: 100 },
  ],
  onRoleChange,
  onStatusChange,
  onMessage,
  onRemove,
}: MemberManagerProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [filterRole, setFilterRole] = useState<'all' | 'member' | 'moderator' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'joinDate' | 'engagement'>('joinDate');

  const roleStyles = {
    member: 'bg-blue-100 text-blue-700',
    moderator: 'bg-yellow-100 text-yellow-700',
    admin: 'bg-red-100 text-red-700',
  };

  const statusStyles = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700',
  };

  function handleRoleChange(memberId: string, newRole: string) {
    onRoleChange?.(memberId, newRole);
    alert(`Role updated to ${newRole}`);
  }

  function handleStatusChange(memberId: string, newStatus: string) {
    onStatusChange?.(memberId, newStatus);
    alert(`Status updated to ${newStatus}`);
  }

  const filteredMembers = members
    .filter((m) => {
      const matchesRole = filterRole === 'all' || m.role === filterRole;
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      const matchesSearch = 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'joinDate') return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      if (sortBy === 'engagement') return b.engagement - a.engagement;
      return 0;
    });

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    moderators: members.filter((m) => m.role === 'moderator').length,
    admins: members.filter((m) => m.role === 'admin').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Member Management</h2>
        <p className="text-sm text-gray-600">Manage community members, roles, and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-yoga-600">
          <p className="text-xs text-gray-600">Total Members</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-xs text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <p className="text-xs text-gray-600">Moderators</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.moderators}</p>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-500">
          <p className="text-xs text-gray-600">Admins</p>
          <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="member">👤 Members</option>
            <option value="moderator">👮 Moderators</option>
            <option value="admin">👑 Admins</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">✅ Active</option>
            <option value="inactive">⏸️ Inactive</option>
            <option value="suspended">❌ Suspended</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
          >
            <option value="joinDate">Newest First</option>
            <option value="name">Alphabetical</option>
            <option value="engagement">Most Engaged</option>
          </select>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No members found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Member</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Join Date</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Activity</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, idx) => (
                  <tr key={member.id} className={`border-b border-gray-200 hover:bg-yoga-50 ${idx === filteredMembers.length - 1 ? '' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{member.avatar}</span>
                        <div>
                          <p className="font-bold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-xs">{new Date(member.joinDate).toLocaleDateString()}</span>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-bold border-0 ${roleStyles[member.role]} cursor-pointer`}
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={member.status}
                        onChange={(e) => handleStatusChange(member.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-bold border-0 ${statusStyles[member.status]} cursor-pointer`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-gray-600">Posts: {member.posts}</p>
                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${member.engagement >= 80 ? 'bg-green-500' : member.engagement >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${member.engagement}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            onMessage?.(member.id);
                            alert(`DM to ${member.name} - Implement messaging`);
                          }}
                          className="px-2 py-1 bg-yoga-100 hover:bg-yoga-200 text-yoga-700 rounded text-xs font-bold"
                          title="Send message"
                        >
                          💬
                        </button>

                        <button
                          onClick={() => setSelectedMember(member)}
                          className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-bold"
                          title="View details"
                        >
                          👁️
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Remove ${member.name}?`)) {
                              onRemove?.(member.id);
                            }
                          }}
                          className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold"
                          title="Remove member"
                        >
                          ❌
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

      {/* Member Details Panel */}
      {selectedMember && (
        <div className="p-4 bg-yoga-50 rounded-lg border-2 border-yoga-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{selectedMember.avatar}</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedMember.name}</h3>
                <p className="text-sm text-gray-600">{selectedMember.email}</p>
              </div>
            </div>
            <button onClick={() => setSelectedMember(null)} className="text-2xl">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white p-2 rounded">
              <p className="text-xs text-gray-600">Joined</p>
              <p className="font-bold text-gray-900">{new Date(selectedMember.joinDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-xs text-gray-600">Posts</p>
              <p className="font-bold text-gray-900">{selectedMember.posts}</p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-xs text-gray-600">Engagement</p>
              <p className="font-bold text-yoga-600">{selectedMember.engagement}%</p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-xs text-gray-600">Member for</p>
              <p className="font-bold text-gray-900">{Math.floor((Date.now() - new Date(selectedMember.joinDate).getTime()) / (1000 * 60 * 60 * 24))} days</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
