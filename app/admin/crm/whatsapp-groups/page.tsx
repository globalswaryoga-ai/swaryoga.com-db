'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface WhatsAppGroup {
  id: string;
  name: string;
  description: string;
  participants: string[];
  participantCount: number;
  isAdmin: boolean;
  inviteCode: string;
  icon?: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

export default function WhatsAppGroupsManagement() {
  const authToken = useAuth() as string | null;
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);
  const [actionMode, setActionMode] = useState<'add-user' | 'send-message' | 'description' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);

  // Fetch groups
  const fetchGroups = async () => {
    if (!authToken) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/whatsapp/groups', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch groups');
      }
    } catch (err) {
      setError('Failed to fetch groups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && authToken) {
      fetchGroups();
    }
  }, [mounted, authToken]);

  const handleAddParticipant = async () => {
    if (!selectedGroup || !phoneInput.trim()) return;

    try {
      const res = await fetch('/api/admin/crm/whatsapp/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: 'add-participant',
          groupId: selectedGroup.id,
          phoneNumber: phoneInput.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ Added ${phoneInput} to group`);
        setPhoneInput('');
        setActionMode(null);
        fetchGroups();
      } else {
        setError(data.error || 'Failed to add participant');
      }
    } catch (err) {
      setError('Error adding participant');
      console.error(err);
    }
  };

  const handleGroupClick = (group: WhatsAppGroup) => {
    console.log('Group clicked:', group.id, group.name);
    setSelectedGroup(group);
    setActionMode(null);
    setError('');
    setSuccess('');
  };

  const handleSendMessage = async () => {
    if (!selectedGroup || (!inputValue.trim() && !mediaUrl.trim())) return;

    try {
      const res = await fetch('/api/admin/crm/whatsapp/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: 'send-message',
          groupId: selectedGroup.id,
          message: inputValue.trim(),
          media: mediaUrl.trim() || undefined
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('✅ Message sent to group');
        setInputValue('');
        setMediaUrl('');
        setActionMode(null);
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Error sending message');
      console.error(err);
    }
  };

  const handleUpdateDescription = async () => {
    if (!selectedGroup || !inputValue.trim()) return;

    try {
      const res = await fetch('/api/admin/crm/whatsapp/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: 'update-description',
          groupId: selectedGroup.id,
          message: inputValue.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('✅ Group description updated');
        setInputValue('');
        setActionMode(null);
        fetchGroups();
      } else {
        setError(data.error || 'Failed to update description');
      }
    } catch (err) {
      setError('Error updating description');
      console.error(err);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-slate-600">Loading WhatsApp Groups...</p>
        </div>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Please log in to manage WhatsApp groups</p>
          <a href="/admin/login" className="text-green-600 hover:text-green-700 font-semibold">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📱 WhatsApp Groups</h1>
          <p className="text-slate-600">Manage your QR WhatsApp groups, members, and messages</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
            {error}
            <button
              onClick={() => setError('')}
              className="ml-4 text-red-600 hover:text-red-800 font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg text-green-800">
            {success}
            <button
              onClick={() => setSuccess('')}
              className="ml-4 text-green-600 hover:text-green-800 font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Groups List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">Groups ({groups.length})</h2>
                <button
                  onClick={fetchGroups}
                  disabled={loading}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 text-sm font-semibold"
                  title="Refresh groups list"
                >
                  {loading ? '⏳' : '🔄'} Refresh
                </button>
              </div>

              {loading && groups.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">Loading groups...</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">No groups found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupClick(group)}
                      type="button"
                      className={`w-full p-3 rounded-lg text-left transition-colors cursor-pointer ${
                        selectedGroup?.id === group.id
                          ? 'bg-green-100 border-2 border-green-600'
                          : 'bg-slate-50 border-2 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">{group.name}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        👥 {group.participantCount} members
                        {group.isAdmin && ' 👑 Admin'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Group Details & Actions */}
          <div className="lg:col-span-2">
            {selectedGroup ? (
              <div className="space-y-6">
                {/* Group Info Card */}
                <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">
                        {selectedGroup.name}
                        {selectedGroup.isAdmin && <span className="text-yellow-600 ml-2">👑</span>}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">Group ID: {selectedGroup.id}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedGroup(null);
                        setActionMode(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Description
                      </label>
                      <p className="text-slate-600 bg-slate-50 p-3 rounded">
                        {selectedGroup.description || '(No description)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Members ({selectedGroup.participantCount})
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 p-3 rounded">
                        {selectedGroup.participants && selectedGroup.participants.length > 0 ? (
                          selectedGroup.participants.map((p) => (
                            <div key={p} className="text-sm text-slate-600 bg-white p-2 rounded">
                              📱 {p}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500">No members listed</div>
                        )}
                      </div>
                    </div>

                    {selectedGroup.inviteCode && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Invite Link
                        </label>
                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded break-all font-mono text-xs">
                          {selectedGroup.inviteCode}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Created
                      </label>
                      <p className="text-sm text-slate-600">
                        {new Date(selectedGroup.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedGroup.isAdmin && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActionMode('add-user')}
                      className={`p-4 rounded-lg font-semibold transition-colors ${
                        actionMode === 'add-user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      ➕ Add User
                    </button>
                    <button
                      onClick={() => setActionMode('send-message')}
                      className={`p-4 rounded-lg font-semibold transition-colors ${
                        actionMode === 'send-message'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      💬 Send Message
                    </button>
                    <button
                      onClick={() => setActionMode('description')}
                      className={`p-4 rounded-lg font-semibold transition-colors ${
                        actionMode === 'description'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      ✏️ Edit Description
                    </button>
                  </div>
                )}

                {/* Action Forms */}
                {actionMode === 'add-user' && (
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h4 className="font-bold text-slate-900 mb-3">Add User to Group</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Enter phone number (e.g., 9876543210)"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleAddParticipant}
                          className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setActionMode(null)}
                          className="flex-1 bg-slate-300 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {actionMode === 'send-message' && (
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h4 className="font-bold text-slate-900 mb-3">Send Message to Group</h4>
                    <div className="space-y-3">
                      <textarea
                        placeholder="Type your message..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 h-24 resize-none"
                        spellCheck="true"
                        style={{ fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif' }}
                      />
                      <input
                        type="text"
                        placeholder="Image URL (optional)"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleSendMessage}
                          className="flex-1 bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700"
                        >
                          Send
                        </button>
                        <button
                          onClick={() => setActionMode(null)}
                          className="flex-1 bg-slate-300 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {actionMode === 'description' && (
                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <h4 className="font-bold text-slate-900 mb-3">Edit Group Description</h4>
                    <div className="space-y-3">
                      <textarea
                        placeholder="Enter group description..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 h-24 resize-none"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleUpdateDescription}
                          className="flex-1 bg-purple-600 text-white font-semibold py-2 rounded-lg hover:bg-purple-700"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => setActionMode(null)}
                          className="flex-1 bg-slate-300 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center border-2 border-dashed border-slate-200">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-slate-600 text-lg font-semibold mb-2">No Group Selected</p>
                <p className="text-slate-500">Select a group from the list to view details and manage</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
