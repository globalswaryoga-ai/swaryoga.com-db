'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
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
  Plus,
  CreditCard,
  Minus,
  Sparkles,
} from 'lucide-react';

declare global {
  interface Window {
    Cashfree?: {
      PG: {
        checkout: (config: { paymentSessionId: string; returnUrl?: string }) => { redirect: () => void };
      };
    };
  }
}

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
  
  // Extra seats state
  const [extraSeats, setExtraSeats] = useState(0);
  const [extraSeatsExpiry, setExtraSeatsExpiry] = useState<string | null>(null);

  // Modal states
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');

  // Buy seats modal
  const [showBuySeats, setShowBuySeats] = useState(false);
  const [seatsToBuy, setSeatsToBuy] = useState(1);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [includeGST, setIncludeGST] = useState(false);
  const [buyingSeats, setBuyingSeats] = useState(false);
  const [cashfreeReady, setCashfreeReady] = useState(false);

  // Seat pricing
  const SEAT_PRICING = {
    monthly: 300,
    quarterly: 810,
    annual: 3000,
  };

  useEffect(() => {
    const slug = localStorage.getItem('tenantSlug') || '';
    setTenantSlug(slug);
    fetchTeam();
    
    // Check URL params for payment status
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const message = params.get('message');
    if (status === 'success' && message) {
      alert(decodeURIComponent(message));
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'error' && message) {
      alert('Error: ' + decodeURIComponent(message));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      // Fetch team data
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

      // Fetch seat addon info
      const seatRes = await fetch(`/api/crm-site/addons/seats?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (seatRes.ok) {
        const seatData = await seatRes.json();
        setExtraSeats(seatData.extraSeats || 0);
        setExtraSeatsExpiry(seatData.extraSeatsExpiry);
        // Update user limit to include extra seats
        if (seatData.totalSeats) {
          setUserLimit(seatData.totalSeats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch team:', err);
    } finally {
      setLoading(false);
    }
  };

  const buyMoreSeats = async () => {
    if (seatsToBuy < 1) return;
    setBuyingSeats(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/addons/seats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          seats: seatsToBuy,
          billing: billingPeriod,
          includeGST,
        }),
      });

      const data = await res.json();
      if (res.ok && data.paymentSessionId) {
        // Initialize Cashfree checkout
        if (window.Cashfree) {
          const checkout = window.Cashfree.PG.checkout({
            paymentSessionId: data.paymentSessionId,
          });
          checkout.redirect();
        } else {
          alert('Payment gateway not loaded. Please refresh and try again.');
        }
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Failed to buy seats:', err);
      alert('Failed to process purchase');
    } finally {
      setBuyingSeats(false);
    }
  };

  const calculateSeatPrice = () => {
    const pricePerSeat = SEAT_PRICING[billingPeriod];
    const subtotal = seatsToBuy * pricePerSeat;
    const gst = includeGST ? Math.ceil(subtotal * 0.18) : 0;
    return { pricePerSeat, subtotal, gst, total: subtotal + gst };
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
      {/* Cashfree SDK */}
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setCashfreeReady(true)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Team Management
          </h1>
          <p className="text-sm text-gray-500">
            {currentCount} of {userLimit} users • {plan} plan
            {extraSeats > 0 && (
              <span className="ml-2 text-green-600">
                (+{extraSeats} extra seat{extraSeats > 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBuySeats(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buy Seats
          </button>
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

      {/* Extra Seats Info Banner */}
      {extraSeats > 0 && extraSeatsExpiry && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">
              {extraSeats} Extra Seat{extraSeats > 1 ? 's' : ''} Active
            </p>
            <p className="text-sm text-green-700">
              Valid until {new Date(extraSeatsExpiry).toLocaleDateString()}. 
              You can add up to {userLimit - currentCount} more team member{userLimit - currentCount !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Limit Warning */}
      {!canAddMore && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">Team limit reached</p>
            <p className="text-sm text-amber-700">
              Your {plan} plan allows {userLimit} team member{userLimit !== 1 ? 's' : ''}. 
              Purchase additional seats or upgrade your plan.
            </p>
            <button
              onClick={() => setShowBuySeats(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition"
            >
              <Plus className="w-4 h-4" />
              Buy More Seats
            </button>
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

      {/* Buy More Seats Modal */}
      {showBuySeats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Buy Additional User Seats
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Add more team members beyond your plan limit. Seats are valid for the selected billing period.
            </p>

            <div className="space-y-6">
              {/* Number of Seats */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Number of Seats</label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setSeatsToBuy(Math.max(1, seatsToBuy - 1))}
                    disabled={seatsToBuy <= 1}
                    className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="w-24 h-16 rounded-xl bg-gray-50 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{seatsToBuy}</span>
                  </div>
                  <button
                    onClick={() => setSeatsToBuy(Math.min(50, seatsToBuy + 1))}
                    disabled={seatsToBuy >= 50}
                    className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">Max 50 seats per purchase</p>
              </div>

              {/* Billing Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Billing Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'monthly', label: 'Monthly', price: '₹300/seat' },
                    { value: 'quarterly', label: '3 Months', price: '₹810/seat', badge: '10% off' },
                    { value: 'annual', label: '1 Year', price: '₹3,000/seat', badge: '17% off' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setBillingPeriod(option.value as any)}
                      className={`relative p-3 rounded-xl border-2 text-left transition ${
                        billingPeriod === option.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.badge && (
                        <span className="absolute -top-2 -right-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                          {option.badge}
                        </span>
                      )}
                      <p className="font-semibold text-gray-900 text-sm">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* GST Option */}
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 text-sm">Add GST (18%)</p>
                  <p className="text-xs text-gray-500">Required for GST invoice</p>
                </div>
                <input
                  type="checkbox"
                  checked={includeGST}
                  onChange={e => setIncludeGST(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>

              {/* Price Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{seatsToBuy} seat{seatsToBuy > 1 ? 's' : ''} × ₹{calculateSeatPrice().pricePerSeat}</span>
                  <span className="text-gray-900">₹{calculateSeatPrice().subtotal.toLocaleString()}</span>
                </div>
                {includeGST && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST (18%)</span>
                    <span className="text-gray-900">₹{calculateSeatPrice().gst.toLocaleString()}</span>
                  </div>
                )}
                <div className="h-px bg-gray-200 my-2" />
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-green-600 text-lg">₹{calculateSeatPrice().total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBuySeats(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={buyMoreSeats}
                  disabled={buyingSeats || !cashfreeReady}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {buyingSeats ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay ₹{calculateSeatPrice().total.toLocaleString()}
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
