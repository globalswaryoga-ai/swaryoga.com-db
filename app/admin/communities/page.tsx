'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit2, Trash2, Users, Globe, Loader2, Search, X, Check } from 'lucide-react';

interface Community {
  _id: string;
  id: string;
  name: string;
  description: string;
  type: 'global' | 'old_sadhak' | 'workshop_active';
  memberCount: number;
  isArchived: boolean;
  joinLink?: string;
  whatsappGroupId?: string;
  createdAt: string;
}

const communityTypes = [
  { value: 'global', label: 'Global (Public)', icon: '🌍' },
  { value: 'old_sadhak', label: 'Old Sadhak (Alumni)', icon: '🧘' },
  { value: 'workshop_active', label: 'Workshop Active', icon: '📚' },
];

export default function AdminCommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'workshop_active' as 'global' | 'old_sadhak' | 'workshop_active',
    joinLink: '',
    whatsappGroupId: '',
  });

  useEffect(() => {
    fetchCommunities();
  }, [showArchived]);

  async function fetchCommunities() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (showArchived) params.set('includeArchived', 'true');
      
      const res = await fetch(`/api/admin/communities?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success) {
        setCommunities(data.communities || []);
      } else {
        setError(data.error || 'Failed to fetch communities');
      }
    } catch (err) {
      setError('Failed to fetch communities');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCommunity(null);
    setForm({
      name: '',
      description: '',
      type: 'workshop_active',
      joinLink: '',
      whatsappGroupId: '',
    });
    setShowModal(true);
  }

  function openEditModal(community: Community) {
    setEditingCommunity(community);
    setForm({
      name: community.name,
      description: community.description || '',
      type: community.type,
      joinLink: community.joinLink || '',
      whatsappGroupId: community.whatsappGroupId || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      alert('Please enter a community name');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = '/api/admin/communities';
      const method = editingCommunity ? 'PUT' : 'POST';
      const body = editingCommunity 
        ? { communityId: editingCommunity._id, ...form }
        : form;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchCommunities();
      } else {
        alert(data.error || 'Failed to save community');
      }
    } catch (err) {
      alert('Failed to save community');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(communityId: string) {
    if (!confirm('Are you sure you want to archive this community? Members will no longer have access.')) {
      return;
    }

    setDeleting(communityId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/communities?communityId=${communityId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        fetchCommunities();
      } else {
        alert(data.error || 'Failed to archive community');
      }
    } catch (err) {
      alert('Failed to archive community');
    } finally {
      setDeleting(null);
    }
  }

  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'global': return 'bg-teal-100 text-teal-700';
      case 'old_sadhak': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getTypeIcon = (type: string) => {
    return communityTypes.find(t => t.value === type)?.icon || '📚';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin" 
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Communities</h1>
                <p className="text-sm text-gray-500">Manage yoga communities</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">New Community</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search communities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Show archived</span>
          </label>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{communities.filter(c => !c.isArchived).length}</p>
            <p className="text-sm text-gray-500">Active Communities</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-teal-600">{communities.filter(c => c.type === 'global').length}</p>
            <p className="text-sm text-gray-500">Global</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-emerald-600">{communities.filter(c => c.type === 'old_sadhak').length}</p>
            <p className="text-sm text-gray-500">Old Sadhak</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-blue-600">{communities.reduce((sum, c) => sum + (c.memberCount || 0), 0)}</p>
            <p className="text-sm text-gray-500">Total Members</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No communities found</h3>
            <p className="text-gray-500 mb-4">Create your first community to get started</p>
            <button
              onClick={openCreateModal}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium"
            >
              Create Community
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunities.map((community) => (
              <div
                key={community._id}
                className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-md ${
                  community.isArchived ? 'border-gray-200 opacity-60' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getTypeIcon(community.type)}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{community.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTypeColor(community.type)}`}>
                        {communityTypes.find(t => t.value === community.type)?.label || community.type}
                      </span>
                    </div>
                  </div>
                  {community.isArchived && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Archived</span>
                  )}
                </div>

                {community.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{community.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{community.memberCount || 0} members</span>
                  </div>
                  
                  {!community.isArchived && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(community)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {community.type !== 'global' && (
                        <button
                          onClick={() => handleDelete(community._id)}
                          disabled={deleting === community._id}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Archive"
                        >
                          {deleting === community._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCommunity ? 'Edit Community' : 'Create Community'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Community Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Pranayama Masters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Describe this community..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {communityTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: type.value as any })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        form.type === type.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-xs font-medium text-gray-700">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Join Link (optional)
                </label>
                <input
                  type="url"
                  value={form.joinLink}
                  onChange={(e) => setForm({ ...form, joinLink: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Group ID (optional)
                </label>
                <input
                  type="text"
                  value={form.whatsappGroupId}
                  onChange={(e) => setForm({ ...form, whatsappGroupId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Group ID for WhatsApp integration"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {editingCommunity ? 'Save Changes' : 'Create Community'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
