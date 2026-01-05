'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, MessageSquare, Send, Mail, Phone, MoreVertical, Trash2, Edit, Shield,
  Search, ChevronDown, Plus, Filter, Download, ArrowRight, CheckCircle, AlertCircle,
  Clock, User, Settings, Loader, Globe
} from 'lucide-react';

type CommunityButton = {
  id: string;
  label: string;
  actionType: 'link' | 'phone' | 'text';
  url?: string;
  phoneNumber?: string;
};

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

  // Admin-controlled chat permissions
  chatEnabled?: boolean;
  chatPermissions?: {
    canSend?: boolean;
    allowText?: boolean;
    allowLinks?: boolean;
    allowImages?: boolean;
    allowVideos?: boolean;
    allowDocuments?: boolean;
  };
}

interface Community {
  id: string;
  name: string;
  icon: string;
  memberCount: number;
}

const COMMUNITIES: Community[] = [
  { id: 'general', name: 'Global Community for General', icon: '🌍', memberCount: 0 },
  { id: 'swar-yoga', name: 'Swar Yoga', icon: '🎵', memberCount: 0 },
  { id: 'aham-bramhasmi', name: 'Aham Bramhasmi', icon: '✨', memberCount: 0 },
  { id: 'astavakra', name: 'Astavakra', icon: '🧘', memberCount: 0 },
  { id: 'shivoham', name: 'Shivoham', icon: '🔱', memberCount: 0 },
  { id: 'i-am-fit', name: 'I am Fit', icon: '💪', memberCount: 0 },
  // Requested new community groups
  { id: 'youth', name: 'Youth', icon: '🚀', memberCount: 0 },
  { id: 'children', name: 'Children', icon: '👶', memberCount: 0 },
  { id: 'married-couple', name: 'Married Couple', icon: '💍', memberCount: 0 },
  { id: 'investors', name: 'Investors', icon: '📈', memberCount: 0 },
  // Legacy / existing groups
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

  // Member chat permission editor
  const [showChatPermModal, setShowChatPermModal] = useState(false);
  const [chatPermSaving, setChatPermSaving] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [canSend, setCanSend] = useState(true);
  const [allowText, setAllowText] = useState(true);
  const [allowLinks, setAllowLinks] = useState(true);
  const [allowImages, setAllowImages] = useState(true);
  const [allowVideos, setAllowVideos] = useState(true);
  const [allowDocuments, setAllowDocuments] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  // Template-like post composer
  const [postHeader, setPostHeader] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postFooter, setPostFooter] = useState('');
  const [postButtons, setPostButtons] = useState<CommunityButton[]>([]);
  const [postTargetMode, setPostTargetMode] = useState<'selected' | 'all'>('selected');
  const [postSelectedCommunityIds, setPostSelectedCommunityIds] = useState<Set<string>>(new Set([selectedCommunity]));
  const [crossPostMedia, setCrossPostMedia] = useState(false);
  const [crossPostSocial, setCrossPostSocial] = useState(false);
  // Legacy inputs (kept for now; uploads aren’t wired end-to-end)
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postDocuments, setPostDocuments] = useState<File[]>([]);
  const [editingCommunityName, setEditingCommunityName] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [editedCommunities, setEditedCommunities] = useState<Record<string, string>>({});

  const openChatPermissions = (member: CommunityMember) => {
    setSelectedMember(member);
    setActionDropdown(null);

    const perms = (member as any)?.chatPermissions || {};

    setChatEnabled(typeof member.chatEnabled === 'boolean' ? member.chatEnabled : true);
    setCanSend(typeof perms.canSend === 'boolean' ? perms.canSend : true);
    setAllowText(typeof perms.allowText === 'boolean' ? perms.allowText : true);
    setAllowLinks(typeof perms.allowLinks === 'boolean' ? perms.allowLinks : true);
    setAllowImages(typeof perms.allowImages === 'boolean' ? perms.allowImages : true);
    setAllowVideos(typeof perms.allowVideos === 'boolean' ? perms.allowVideos : true);
    setAllowDocuments(typeof perms.allowDocuments === 'boolean' ? perms.allowDocuments : true);

    setShowChatPermModal(true);
  };

  const saveChatPermissions = async () => {
    if (!selectedMember) return;
    try {
      setChatPermSaving(true);
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');

      const res = await fetch(`/api/admin/community/members/${selectedMember._id}/chat-permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatEnabled,
          canSend,
          allowText,
          allowLinks,
          allowImages,
          allowVideos,
          allowDocuments,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert('❌ ' + (json?.error || 'Failed to update chat permissions'));
        return;
      }

      // Best-effort local update
      setMembers((prev) =>
        prev.map((m) =>
          m._id === selectedMember._id
            ? {
                ...m,
                chatEnabled,
                chatPermissions: {
                  canSend,
                  allowText,
                  allowLinks,
                  allowImages,
                  allowVideos,
                  allowDocuments,
                },
              }
            : m
        )
      );

      alert('✅ Chat permissions updated');
      setShowChatPermModal(false);
    } catch (e) {
      alert('❌ Error updating chat permissions');
      console.error(e);
    } finally {
      setChatPermSaving(false);
    }
  };

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

  // Create admin post
  const addPostButton = () => {
    setPostButtons((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 9),
        label: `Button ${prev.length + 1}`,
        actionType: 'link',
        url: '',
      },
    ]);
  };

  const updatePostButton = (id: string, updates: Partial<CommunityButton>) => {
    setPostButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removePostButton = (id: string) => {
    setPostButtons((prev) => prev.filter((b) => b.id !== id));
  };

  const createAdminPost = async () => {
    const hasContent = Boolean(postHeader.trim() || postContent.trim() || postFooter.trim());
    if (!hasContent && postImages.length === 0 && postDocuments.length === 0) {
      alert('Post content or files are required');
      return;
    }

    const communityIds =
      postTargetMode === 'all'
        ? COMMUNITIES.map((c) => c.id)
        : [...postSelectedCommunityIds];

    if (communityIds.length === 0) {
      alert('Select at least one community');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');

      const response = await fetch('/api/admin/crm/community/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          communityIds,
          headerText: postHeader,
          content: postContent,
          footerText: postFooter,
          buttons: postButtons,
          crossPost: {
            media: crossPostMedia,
            socialMedia: crossPostSocial,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert('❌ ' + (error.error || 'Failed to create post'));
        return;
      }

      const data = await response.json().catch(() => null);
      alert(`✅ ${(data?.message as string) || 'Post published to community!'}`);
      setShowPostModal(false);
      setPostHeader('');
      setPostContent('');
      setPostFooter('');
      setPostButtons([]);
      setCrossPostMedia(false);
      setCrossPostSocial(false);
      setPostImages([]);
      setPostDocuments([]);
      setPostTargetMode('selected');
      setPostSelectedCommunityIds(new Set([selectedCommunity]));
    } catch (err) {
      alert('❌ Error creating post');
      console.error(err);
    }
  };

  useEffect(() => {
    // Keep current community selected by default in the modal.
    setPostSelectedCommunityIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set([selectedCommunity]);
    });
  }, [selectedCommunity]);

  // Update community name
  const updateCommunityName = async () => {
    if (!newCommunityName.trim()) {
      alert('Enter a new community name');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/community/admin/${selectedCommunity}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCommunityName }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('❌ ' + (error.error || 'Failed to update community name'));
        return;
      }

      // Update local state
      setEditedCommunities(prev => ({
        ...prev,
        [selectedCommunity]: newCommunityName
      }));
      
      alert('✅ Community name updated!');
      setEditingCommunityName(false);
      setNewCommunityName('');
    } catch (err) {
      alert('❌ Error updating community name');
      console.error(err);
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
        const params = new URLSearchParams();
        params.set('communityId', selectedCommunity);
        params.set('status', statusFilter);
        params.set('limit', '200');

        const res = await fetch(`/api/admin/community/members?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch members');

        const rows = Array.isArray(json?.data?.members) ? json.data.members : [];
        setMembers(rows);
      } catch (error) {
        console.error('Error fetching members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [selectedCommunity, statusFilter, router]);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.mobile.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const currentCommunity = COMMUNITIES.find(c => c.id === selectedCommunity);
  // Members are fetched per-community for this page.
  // If/when we fetch a mixed list, CommunityMember does have `communityId` in the DB schema.
  const memberCount = members.length;

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
                <h1 className="text-3xl font-bold">
                  {editedCommunities[selectedCommunity] || currentCommunity?.name}
                </h1>
                <p className="text-white/80 flex gap-4">
                  <span>👥 {memberCount} members</span>
                  <span>💬 {members.reduce((sum, m) => sum + m.messageCount, 0)} messages</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPostModal(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all flex items-center gap-2">
                <MessageSquare size={18} />
                Create Post
              </button>
              <button 
                onClick={() => {
                  setEditingCommunityName(true);
                  setNewCommunityName(currentCommunity?.name || '');
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all flex items-center gap-2">
                <Edit size={18} />
                Edit Name
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
                            <button
                              onClick={() => openChatPermissions(member)}
                              className="w-full text-left px-4 py-2 text-blue-200 hover:bg-gray-600 flex items-center gap-2 text-sm border-t border-gray-600"
                            >
                              <Shield size={16} /> Chat Permissions
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

      {/* Chat Permissions Modal */}
      {showChatPermModal && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-xl w-full border border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-extrabold">Chat Permissions</div>
                <div className="text-xs text-white/80 mt-0.5">
                  {selectedMember.name} • {selectedMember.mobile}
                </div>
              </div>
              <button
                onClick={() => setShowChatPermModal(false)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between gap-3 bg-gray-700/60 border border-gray-600 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-white font-semibold text-sm">Chat Enabled</div>
                    <div className="text-gray-300 text-xs">Turn chat on/off for this user</div>
                  </div>
                  <input type="checkbox" checked={chatEnabled} onChange={(e) => setChatEnabled(e.target.checked)} />
                </label>

                <label className="flex items-center justify-between gap-3 bg-gray-700/60 border border-gray-600 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-white font-semibold text-sm">Can Send</div>
                    <div className="text-gray-300 text-xs">Master send permission</div>
                  </div>
                  <input type="checkbox" checked={canSend} onChange={(e) => setCanSend(e.target.checked)} />
                </label>
              </div>

              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                <div className="text-white font-semibold text-sm mb-3">Allowed Content Types</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between gap-3 bg-gray-800/40 border border-gray-600 rounded-lg px-4 py-3">
                    <div className="text-sm text-white font-semibold">Text</div>
                    <input type="checkbox" checked={allowText} onChange={(e) => setAllowText(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-3 bg-gray-800/40 border border-gray-600 rounded-lg px-4 py-3">
                    <div className="text-sm text-white font-semibold">Links</div>
                    <input type="checkbox" checked={allowLinks} onChange={(e) => setAllowLinks(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-3 bg-gray-800/40 border border-gray-600 rounded-lg px-4 py-3">
                    <div className="text-sm text-white font-semibold">Images</div>
                    <input type="checkbox" checked={allowImages} onChange={(e) => setAllowImages(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-3 bg-gray-800/40 border border-gray-600 rounded-lg px-4 py-3">
                    <div className="text-sm text-white font-semibold">Videos</div>
                    <input type="checkbox" checked={allowVideos} onChange={(e) => setAllowVideos(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-3 bg-gray-800/40 border border-gray-600 rounded-lg px-4 py-3">
                    <div className="text-sm text-white font-semibold">Documents</div>
                    <input type="checkbox" checked={allowDocuments} onChange={(e) => setAllowDocuments(e.target.checked)} />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChatPermModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={chatPermSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveChatPermissions}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                  disabled={chatPermSaving}
                >
                  {chatPermSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full border border-gray-700">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MessageSquare size={20} />
                Create Community Post
              </h3>
              <button
                onClick={() => {
                  setShowPostModal(false);
                  setPostHeader('');
                  setPostContent('');
                  setPostFooter('');
                  setPostButtons([]);
                  setCrossPostMedia(false);
                  setCrossPostSocial(false);
                  setPostTargetMode('selected');
                  setPostSelectedCommunityIds(new Set([selectedCommunity]));
                  setPostImages([]);
                  setPostDocuments([]);
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="text-white font-semibold">Send To</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPostTargetMode('selected')}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        postTargetMode === 'selected'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-750'
                      }`}
                    >
                      Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostTargetMode('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        postTargetMode === 'all'
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-750'
                      }`}
                    >
                      All Groups
                    </button>
                  </div>
                </div>

                {postTargetMode === 'selected' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {COMMUNITIES.map((c) => {
                      const checked = postSelectedCommunityIds.has(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg p-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(postSelectedCommunityIds);
                              if (e.target.checked) next.add(c.id);
                              else next.delete(c.id);
                              setPostSelectedCommunityIds(next);
                            }}
                          />
                          <span className="text-white">{c.icon} {c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-300">
                    This will publish to <span className="text-white font-semibold">all</span> community groups ({COMMUNITIES.length}).
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-semibold mb-2">Header (optional)</label>
                  <input
                    type="text"
                    value={postHeader}
                    onChange={(e) => setPostHeader(e.target.value)}
                    placeholder="e.g., Today's Update"
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-white font-semibold mb-2">Footer (optional)</label>
                  <input
                    type="text"
                    value={postFooter}
                    onChange={(e) => setPostFooter(e.target.value)}
                    placeholder="e.g., Swar Yoga Team"
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Message</label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Write your post message..."
                  className="w-full h-32 px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-white font-semibold">Buttons (optional)</div>
                  <button
                    type="button"
                    onClick={addPostButton}
                    className="px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    + Add Button
                  </button>
                </div>

                {postButtons.length === 0 ? (
                  <div className="text-sm text-gray-400">No buttons added.</div>
                ) : (
                  <div className="space-y-3">
                    {postButtons.map((btn) => (
                      <div key={btn.id} className="rounded-lg border border-gray-700 bg-gray-800/60 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Label</label>
                            <input
                              type="text"
                              value={btn.label}
                              onChange={(e) => updatePostButton(btn.id, { label: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Type</label>
                            <select
                              value={btn.actionType}
                              onChange={(e) => updatePostButton(btn.id, { actionType: e.target.value as any, url: '', phoneNumber: '' })}
                              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="link">Link</option>
                              <option value="phone">Phone</option>
                              <option value="text">Text</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Value</label>
                            {btn.actionType === 'link' ? (
                              <input
                                type="url"
                                value={btn.url || ''}
                                onChange={(e) => updatePostButton(btn.id, { url: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : btn.actionType === 'phone' ? (
                              <input
                                type="tel"
                                value={btn.phoneNumber || ''}
                                onChange={(e) => updatePostButton(btn.id, { phoneNumber: e.target.value })}
                                placeholder="+91..."
                                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <input
                                type="text"
                                disabled
                                value="Shown as text"
                                className="w-full px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg"
                              />
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removePostButton(btn.id)}
                            className="px-3 py-1.5 bg-red-600/20 text-red-200 border border-red-700/50 rounded-lg hover:bg-red-600/30 transition-colors text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crossPostMedia}
                    onChange={(e) => setCrossPostMedia(e.target.checked)}
                  />
                  <span className="text-white">Also create a Media post</span>
                </label>
                <label className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crossPostSocial}
                    onChange={(e) => setCrossPostSocial(e.target.checked)}
                  />
                  <span className="text-white">Also create a Social Media post</span>
                </label>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                <div className="text-white font-semibold mb-2">Preview</div>
                <div className="whitespace-pre-wrap text-gray-200 text-sm bg-gray-800/70 border border-gray-700 rounded-lg p-3">
                  {(postHeader.trim() ? postHeader.trim() + '\n' : '') +
                    (postContent.trim() ? postContent.trim() + '\n' : '') +
                    (postFooter.trim() ? postFooter.trim() : '')}
                  {postButtons.length > 0 && (
                    <>
                      {'\n\nButtons:'}
                      {postButtons.map((b, idx) => (
                        <span key={b.id}>{`\n${idx + 1}. ${b.label}${b.actionType === 'link' && b.url ? ` → ${b.url}` : b.actionType === 'phone' && b.phoneNumber ? ` → ${b.phoneNumber}` : ''}`}</span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">📸 Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setPostImages(Array.from(e.target.files || []))}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {postImages.length > 0 && (
                  <p className="text-sm text-gray-400 mt-1">✓ {postImages.length} image(s) selected</p>
                )}
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">📹 Videos & Documents</label>
                <input
                  type="file"
                  multiple
                  accept="video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => setPostDocuments(Array.from(e.target.files || []))}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {postDocuments.length > 0 && (
                  <p className="text-sm text-gray-400 mt-1">✓ {postDocuments.length} file(s) selected</p>
                )}
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowPostModal(false);
                    setPostHeader('');
                    setPostContent('');
                    setPostFooter('');
                    setPostButtons([]);
                    setCrossPostMedia(false);
                    setCrossPostSocial(false);
                    setPostTargetMode('selected');
                    setPostSelectedCommunityIds(new Set([selectedCommunity]));
                    setPostImages([]);
                    setPostDocuments([]);
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createAdminPost}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Send size={16} />
                  Publish Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Community Name Modal */}
      {editingCommunityName && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Edit size={20} />
                Edit Community Name
              </h3>
              <button
                onClick={() => setEditingCommunityName(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Community Name</label>
                <input
                  type="text"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  placeholder="Enter new community name..."
                  className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setEditingCommunityName(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateCommunityName}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Save Name
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
