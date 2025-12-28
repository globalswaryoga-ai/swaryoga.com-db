'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, MessageSquare, Send, Mail, Phone, MoreVertical, Trash2, Edit, Shield,
  Search, ChevronDown, Plus, Filter, Download, ArrowRight, CheckCircle, AlertCircle,
  Clock, User, Settings, Loader
} from 'lucide-react';

interface CommunityMember {
  _id: string;
  name: string;
  email?: string;
  mobile: string;
  communityName: string;
  joinedAt: string;
  status: 'active' | 'inactive' | 'banned';
  approved?: boolean;
  approvedAt?: string;
  messageCount: number;
  reactions: number;
}

interface Community {
  id: string;
  name: string;
  icon: string;
  memberCount: number;
}

const COMMUNITIES: Community[] = [
  { id: 'general', name: 'General Community', icon: '🌍', memberCount: 0 },
  { id: 'swar-yoga', name: 'Swar Yoga', icon: '🎵', memberCount: 0 },
  { id: 'aham-bramhasmi', name: 'Aham Bramhasmi', icon: '✨', memberCount: 0 },
  { id: 'astavakra', name: 'Astavakra', icon: '🧘', memberCount: 0 },
  { id: 'shivoham', name: 'Shivoham', icon: '🔱', memberCount: 0 },
  { id: 'i-am-fit', name: 'I am Fit', icon: '💪', memberCount: 0 },
  { id: 'children-yoga', name: 'Children Swar Yoga', icon: '👶', memberCount: 0 },
  { id: 'youth-yoga', name: 'Youth Swar Yoga', icon: '🚀', memberCount: 0 },
  { id: 'english-yoga', name: 'English Swar Yoga', icon: '🌐', memberCount: 0 },
  { id: 'shankara', name: 'Shankara', icon: '📚', memberCount: 0 },
  { id: 'amrut-bhoj', name: 'Amrut Bhoj', icon: '🍯', memberCount: 0 },
  { id: 'yogasana', name: 'Yogasana', icon: '🕉️', memberCount: 0 },
  { id: 'businessman', name: 'Businessman', icon: '💼', memberCount: 0 },
];

export default function AdminCommunityPage() {
  const router = useRouter();
  const [selectedCommunity, setSelectedCommunity] = useState('general');
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all');
  const [loading, setLoading] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);
  const [messageText, setMessageText] = useState('');
  const [actionDropdown, setActionDropdown] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  // Approve member for messaging in general community
  const approveMember = async (memberId: string) => {
    try {
      setApproving(memberId);
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/admin/community/members/${memberId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('❌ ' + (error.error || 'Failed to approve member'));
        return;
      }

      // Update local state
      setMembers(members.map(m => 
        m._id === memberId ? { ...m, approved: true, approvedAt: new Date().toISOString() } : m
      ));
      setActionDropdown(null);
      alert('✅ Member approved for messaging!');
    } catch (err) {
      alert('❌ Error approving member');
      console.error(err);
    } finally {
      setApproving(null);
    }
  };

  // Search for user to add to community
  const searchUser = async () => {
    if (!searchUserQuery.trim()) {
      alert('Enter a name, email, or user ID');
      return;
    }

    try {
      setSearchingUser(true);
      setFoundUser(null);
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/community/admin/find-user?q=${encodeURIComponent(searchUserQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        alert('❌ ' + (error.error || 'User not found'));
        return;
      }

      const data = await response.json();
      setFoundUser(data.data);
    } catch (err) {
      alert('❌ Error searching for user');
      console.error(err);
    } finally {
      setSearchingUser(false);
    }
  };

  // Add member to community
  const addMemberToCommunity = async () => {
    if (!foundUser) {
      alert('Search and select a user first');
      return;
    }

    if (!selectedCommunity) {
      alert('Select a community first');
      return;
    }

    try {
      setAddingMember(true);
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
      
      const response = await fetch('/api/community/admin/add-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          communityId: selectedCommunity, 
          userId: foundUser.userId 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('❌ ' + (error.error || 'Failed to add member'));
        return;
      }

      alert('✅ Member added to community!');
      setShowAddMemberModal(false);
      setFoundUser(null);
      setSearchUserQuery('');
      // Reload members
      // You may want to fetch members again here
    } catch (err) {
      alert('❌ Error adding member');
      console.error(err);
    } finally {
      setAddingMember(false);
    }
  };

  // Fetch members when community changes
  useEffect(() => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      try {
        // This would fetch from an API endpoint we'll create
        // For now, show empty state
        setMembers([]);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [selectedCommunity, router]);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.mobile.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const currentCommunity = COMMUNITIES.find(c => c.id === selectedCommunity);
  const memberCount = members.filter(m => m.communityId === selectedCommunity).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 sticky top-0 bg-gray-800/95 backdrop-blur">
          <h2 className="text-lg font-bold text-white mb-2">Communities</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Communities List */}
        <div className="p-3 space-y-2">
          {COMMUNITIES.map((community) => (
            <button
              key={community.id}
              onClick={() => setSelectedCommunity(community.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                selectedCommunity === community.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="text-2xl">{community.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{community.name}</p>
                <p className="text-xs text-gray-400">0 members</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Actions */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 border-b border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{currentCommunity?.icon}</span>
              <div>
                <h1 className="text-3xl font-bold">{currentCommunity?.name}</h1>
                <p className="text-white/80 flex gap-4">
                  <span>👥 {memberCount} members</span>
                  <span>💬 {members.reduce((sum, m) => sum + m.messageCount, 0)} messages</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all flex items-center gap-2">
                <Mail size={18} />
                Send Message
              </button>
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all flex items-center gap-2">
                <Download size={18} />
                Export
              </button>
              <div className="relative group">
                <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all flex items-center gap-2">
                  <Settings size={18} />
                  <ChevronDown size={16} />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                  <button 
                    onClick={() => setShowAddMemberModal(true)}
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2 text-sm">
                    <Plus size={16} /> Add Member
                  </button>
                  <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2 text-sm border-t border-gray-700">
                    <Shield size={16} /> Manage Admins
                  </button>
                  <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2 text-sm border-t border-gray-700">
                    <Filter size={16} /> Community Rules
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search members by name, email, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/10 text-white placeholder-white/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/20"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/20"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>

        {/* Members Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading members...</p>
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users size={48} className="mx-auto text-gray-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No members yet</h3>
                <p className="text-gray-500">Users will appear here when they join the community</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {filteredMembers.map((member) => (
                <div
                  key={member._id}
                  className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                          {member.name}
                          {member.status === 'active' && <CheckCircle size={16} className="text-green-500" />}
                        </h3>
                        <div className="flex gap-4 text-sm text-gray-400 mt-1">
                          {member.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={14} /> {member.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Phone size={14} /> {member.mobile}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-6 text-center">
                        <div>
                          <p className="text-white font-bold">{member.messageCount}</p>
                          <p className="text-xs text-gray-400">Messages</p>
                        </div>
                        <div>
                          <p className="text-white font-bold">{member.reactions}</p>
                          <p className="text-xs text-gray-400">Reactions</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMessageModal(true);
                        }}
                        className="p-2 text-blue-400 hover:bg-gray-600 rounded transition-colors"
                        title="Send Message"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button
                        className="p-2 text-yellow-400 hover:bg-gray-600 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setActionDropdown(actionDropdown === member._id ? null : member._id)}
                          className="p-2 text-gray-400 hover:bg-gray-600 rounded transition-colors"
                          title="More Options"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {actionDropdown === member._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-10">
                            {selectedCommunity === 'general' && !member.approved && (
                              <>
                                <button 
                                  onClick={() => approveMember(member._id)}
                                  disabled={approving === member._id}
                                  className="w-full text-left px-4 py-2 text-green-400 hover:bg-gray-600 flex items-center gap-2 text-sm disabled:opacity-50"
                                >
                                  <CheckCircle size={16} /> 
                                  {approving === member._id ? 'Approving...' : 'Approve for Messaging'}
                                </button>
                                <div className="border-t border-gray-600"></div>
                              </>
                            )}
                            {selectedCommunity === 'general' && member.approved && (
                              <>
                                <div className="w-full px-4 py-2 text-green-400 flex items-center gap-2 text-sm bg-gray-600/50">
                                  <CheckCircle size={16} /> Approved ✓
                                </div>
                                <div className="border-t border-gray-600"></div>
                              </>
                            )}
                            <button className="w-full text-left px-4 py-2 text-yellow-400 hover:bg-gray-600 flex items-center gap-2 text-sm">
                              <Edit size={16} /> Edit
                            </button>
                            <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-600 flex items-center gap-2 text-sm border-t border-gray-600">
                              <Shield size={16} /> Make Admin
                            </button>
                            <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-600 flex items-center gap-2 text-sm border-t border-gray-600">
                              <AlertCircle size={16} /> Ban Member
                            </button>
                            <button className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-600 flex items-center gap-2 text-sm border-t border-gray-600">
                              <Trash2 size={16} /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full border border-gray-700">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  {selectedMember.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold">{selectedMember.name}</h3>
                  <p className="text-sm text-white/80">{selectedMember.mobile}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <label className="block text-white font-semibold mb-3">Send Message</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="w-full h-32 px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />

              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Send message logic
                    setMessageText('');
                    setShowMessageModal(false);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Send size={16} />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Plus size={24} />
                Add Member to Community
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2 text-sm">Search User</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Name, email, or user ID..."
                    className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={searchUser}
                    disabled={searchingUser}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {searchingUser ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
                    Search
                  </button>
                </div>
              </div>

              {foundUser && (
                <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <p className="text-white font-semibold">{foundUser.name}</p>
                  <p className="text-gray-300 text-sm">{foundUser.email}</p>
                  <p className="text-gray-400 text-xs">ID: {foundUser.userId}</p>
                </div>
              )}

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setFoundUser(null);
                    setSearchUserQuery('');
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addMemberToCommunity}
                  disabled={!foundUser || addingMember}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {addingMember ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
