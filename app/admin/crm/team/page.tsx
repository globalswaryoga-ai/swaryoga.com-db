'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Edit2,
  Clock,
  Check,
  X,
  Loader2,
  RefreshCw,
  Crown,
  AlertCircle,
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  permissions: string[];
  joinedAt?: string;
  lastActiveAt?: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  expiresAt: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access except billing' },
  { value: 'editor', label: 'Editor', description: 'Create and edit leads, send messages' },
  { value: 'viewer', label: 'Viewer', description: 'View-only access' },
];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'bg-amber-100', text: 'text-amber-700' },
  admin: { bg: 'bg-purple-100', text: 'text-purple-700' },
  editor: { bg: 'bg-blue-100', text: 'text-blue-700' },
  viewer: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [userLimit, setUserLimit] = useState(1);
  const [currentCount, setCurrentCount] = useState(0);
  const [plan, setPlan] = useState('free');
  const [tenantSlug, setTenantSlug] = useState('');

  // Modal states
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    const slug = localStorage.getItem('tenantSlug') || '';
    setTenantSlug(slug);
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/team?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setInvites(data.invites || []);
        setUserLimit(data.userLimit);
        setCurrentCount(data.currentCount);
        setPlan(data.plan);
      }
    } catch (err) {
      console.error('Failed to fetch team:', err);
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowInvite(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('viewer');
        fetchTeam();
      } else {
        alert(data.error || 'Failed to send invite');
      }
    } catch (err) {
      console.error('Failed to invite:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateMember = async () => {
    if (!editMember) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/team', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          memberId: editMember.id,
          role: editRole,
        }),
      });

      setEditMember(null);
      fetchTeam();
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/team', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, memberId }),
      });
      fetchTeam();
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/team', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, inviteId }),
      });
      fetchTeam();
    } catch (err) {
      console.error('Failed to cancel invite:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const canAddMore = currentCount < userLimit;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Team Management
          </h1>
          <p className="text-sm text-gray-500">
            {currentCount} of {userLimit} users • {plan} plan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTeam}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowInvite(true)}
            disabled={!canAddMore}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Limit Warning */}
      {!canAddMore && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Team limit reached</p>
            <p className="text-sm text-amber-700">
              Your {plan} plan allows {userLimit} team member{userLimit !== 1 ? 's' : ''}. 
              Upgrade to add more.
            </p>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Team Members</h2>
        </div>
        
        {members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No team members yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map(member => {
              const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.viewer;
              return (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                      {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        {member.name || member.email.split('@')[0]}
                        {member.role === 'owner' && <Crown className="w-4 h-4 text-amber-500" />}
                      </p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${roleStyle.bg} ${roleStyle.text}`}>
                      {member.role}
                    </span>
                    {member.role !== 'owner' && (
                      <>
                        <button
                          onClick={() => {
                            setEditMember(member);
                            setEditRole(member.role);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Pending Invites
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {invites.map(invite => (
              <div key={invite.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-600">
                    {invite.role}
                  </span>
                  <button
                    onClick={() => cancelInvite(invite.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Invite Team Member
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="space-y-2">
                  {ROLES.map(role => (
                    <label
                      key={role.value}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition ${
                        inviteRole === role.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={inviteRole === role.value}
                        onChange={e => setInviteRole(e.target.value)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{role.label}</p>
                        <p className="text-xs text-gray-500">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowInvite(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={inviteMember}
                  disabled={saving || !inviteEmail.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Edit Role for {editMember.name || editMember.email}
            </h3>

            <div className="space-y-2 mb-6">
              {ROLES.map(role => (
                <label
                  key={role.value}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition ${
                    editRole === role.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="editRole"
                    value={role.value}
                    checked={editRole === role.value}
                    onChange={e => setEditRole(e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{role.label}</p>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditMember(null)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={updateMember}
                disabled={saving}
                className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
