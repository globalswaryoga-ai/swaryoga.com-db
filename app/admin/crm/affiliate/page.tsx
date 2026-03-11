'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Users,
  DollarSign,
  Link2,
  Copy,
  Check,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Wallet,
  CreditCard,
  Percent,
  ExternalLink,
  Search,
  RefreshCw,
  Edit2,
  Save,
} from 'lucide-react';

interface Affiliate {
  _id: string;
  userId: string;
  affiliateCode: string;
  name: string;
  email: string;
  phone: string;
  commissionPercent: number;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  totalReferrals: number;
  totalSales: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  paymentMethod: string;
  bankDetails: {
    upiId?: string;
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
  };
  createdAt: string;
  approvedAt?: string;
}

interface Referral {
  _id: string;
  customerName: string;
  customerEmail: string;
  saleAmount: number;
  commissionAmount: number;
  status: string;
  productName: string;
  createdAt: string;
}

interface Stats {
  totalAffiliates: number;
  totalSales: number;
  totalEarnings: number;
  pendingEarnings: number;
}

export default function AffiliatePage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  const [loading, setLoading] = useState(true);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);

  // Super admin state
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allAffiliates, setAllAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCommission, setEditCommission] = useState(10);

  // Application form state
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    paymentMethod: 'upi',
    upiId: '',
    termsAccepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if super admin
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const resolvedUserId = u?.userId || '';
        const legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        const pv2 = u?.permissionsV2 || null;
        // Super Admin = ONLY userId 'admin' or 'admincrm' (hardcoded)
        const superAdmin =
          resolvedUserId === 'admin' ||
          resolvedUserId === 'admincrm';
        setIsSuperAdmin(superAdmin);
        // Pre-fill form with user info
        if (u?.name) setFormData(prev => ({ ...prev, name: u.name }));
        if (u?.email) setFormData(prev => ({ ...prev, email: u.email }));
      } catch {}
    }
  }, []);

  // Load affiliate data
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // First load user's own affiliate status
      const data = await crmFetch('/api/admin/crm/affiliate');
      setIsAffiliate(data.isAffiliate);
      setAffiliate(data.affiliate);
      setReferrals(data.referrals || []);

      // If super admin, also load all affiliates
      if (isSuperAdmin) {
        const params = new URLSearchParams({ all: 'true' });
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (searchQuery) params.set('search', searchQuery);
        
        const adminData = await crmFetch(`/api/admin/crm/affiliate?${params.toString()}`);
        setAllAffiliates(adminData.affiliates || []);
        setStats(adminData.stats || null);
      }
    } catch (err: any) {
      console.error('Failed to load affiliate data:', err);
    }
    setLoading(false);
  }, [token, crmFetch, isSuperAdmin, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply to become affiliate
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const data = await crmFetch('/api/admin/crm/affiliate', {
        method: 'POST',
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          paymentMethod: formData.paymentMethod,
          bankDetails: { upiId: formData.upiId },
          termsAccepted: formData.termsAccepted,
        },
      });

      setSuccessMessage(data.message || 'Application submitted successfully!');
      setShowApplyForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    }
    setSubmitting(false);
  };

  // Copy referral link
  const copyReferralLink = () => {
    if (!affiliate) return;
    const link = `https://swaryoga.com/?ref=${affiliate.affiliateCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Super admin: Update affiliate status/commission
  const handleUpdateAffiliate = async (affiliateId: string, updates: any) => {
    try {
      await crmFetch('/api/admin/crm/affiliate', {
        method: 'PUT',
        body: { affiliateId, ...updates },
      });
      setEditingId(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update affiliate');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      case 'suspended':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Suspended</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-400" />
            Affiliate Program
          </h1>
          <p className="text-gray-400 mt-1">Earn commission by referring customers to Swar Yoga</p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Super Admin View */}
      {isSuperAdmin && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Affiliates</p>
                    <p className="text-xl font-bold text-white">{stats.totalAffiliates}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Sales</p>
                    <p className="text-xl font-bold text-white">₹{stats.totalSales.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Commissions</p>
                    <p className="text-xl font-bold text-white">₹{stats.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Clock className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Pending Payouts</p>
                    <p className="text-xl font-bold text-white">₹{stats.pendingEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search affiliates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Affiliates Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Affiliate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Commission %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Sales</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Earnings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {allAffiliates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No affiliates found
                      </td>
                    </tr>
                  ) : (
                    allAffiliates.map((aff) => (
                      <tr key={aff._id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-white">{aff.name}</p>
                            <p className="text-xs text-gray-500">{aff.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="px-2 py-1 bg-gray-800 rounded text-sm text-indigo-400">{aff.affiliateCode}</code>
                        </td>
                        <td className="px-4 py-3">
                          {editingId === aff._id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editCommission}
                                onChange={(e) => setEditCommission(Number(e.target.value))}
                                min="0"
                                max="100"
                                className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                              />
                              <span className="text-gray-400">%</span>
                              <button
                                onClick={() => handleUpdateAffiliate(aff._id, { commissionPercent: editCommission })}
                                className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{aff.commissionPercent}%</span>
                              <button
                                onClick={() => { setEditingId(aff._id); setEditCommission(aff.commissionPercent); }}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white">₹{aff.totalSales.toLocaleString()}</td>
                        <td className="px-4 py-3 text-green-400">₹{aff.totalEarnings.toLocaleString()}</td>
                        <td className="px-4 py-3">{getStatusBadge(aff.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {aff.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateAffiliate(aff._id, { status: 'approved' })}
                                  className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateAffiliate(aff._id, { status: 'rejected' })}
                                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {aff.status === 'approved' && (
                              <button
                                onClick={() => handleUpdateAffiliate(aff._id, { status: 'suspended' })}
                                className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30"
                              >
                                Suspend
                              </button>
                            )}
                            {aff.status === 'suspended' && (
                              <button
                                onClick={() => handleUpdateAffiliate(aff._id, { status: 'approved' })}
                                className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Regular User View */}
      {!isSuperAdmin && (
        <>
          {/* Not an affiliate yet */}
          {!isAffiliate && !showApplyForm && (
            <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Become an Affiliate Partner</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Join our affiliate program and earn <span className="text-green-400 font-semibold">10% commission</span> on every successful referral. 
                Share your unique link and start earning passive income!
              </p>
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <div className="flex items-center gap-2 text-gray-300">
                  <Percent className="w-5 h-5 text-green-400" />
                  <span>10% Commission</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <span>Lifetime Earnings</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <span>Easy Payouts</span>
                </div>
              </div>
              <button
                onClick={() => setShowApplyForm(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition"
              >
                Apply Now
              </button>
            </div>
          )}

          {/* Application Form */}
          {showApplyForm && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-white mb-4">Affiliate Application</h2>
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">UPI ID (for payouts)</label>
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="yourname@upi"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-400">
                    I agree to the affiliate program <a href="/terms" target="_blank" className="text-indigo-400 hover:underline">terms and conditions</a>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.termsAccepted}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Affiliate Dashboard */}
          {isAffiliate && affiliate && (
            <div className="space-y-6">
              {/* Status Banner */}
              {affiliate.status === 'pending' && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center gap-3">
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Application Pending</p>
                    <p className="text-sm opacity-80">Your affiliate application is under review. We'll notify you once approved.</p>
                  </div>
                </div>
              )}

              {affiliate.status === 'approved' && (
                <>
                  {/* Referral Link Card */}
                  <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Link2 className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-semibold text-white">Your Referral Link</h3>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                      <code className="flex-1 text-indigo-300 text-sm break-all">
                        https://swaryoga.com/?ref={affiliate.affiliateCode}
                      </code>
                      <button
                        onClick={copyReferralLink}
                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-3">
                      Share this link with potential customers. You earn <span className="text-green-400 font-semibold">{affiliate.commissionPercent}%</span> commission on every sale!
                    </p>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/20">
                          <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Total Referrals</p>
                          <p className="text-xl font-bold text-white">{affiliate.totalReferrals}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Total Sales</p>
                          <p className="text-xl font-bold text-white">₹{affiliate.totalSales.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                          <Wallet className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Total Earnings</p>
                          <p className="text-xl font-bold text-green-400">₹{affiliate.totalEarnings.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/20">
                          <Clock className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Pending Payout</p>
                          <p className="text-xl font-bold text-white">₹{affiliate.pendingEarnings.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Referrals */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <h3 className="font-semibold text-white">Recent Referrals</h3>
                    </div>
                    {referrals.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No referrals yet. Share your link to start earning!
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-800/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Customer</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Sale Amount</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Your Commission</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {referrals.map((ref) => (
                              <tr key={ref._id} className="hover:bg-gray-800/30">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-white">{ref.customerName || 'Anonymous'}</p>
                                  <p className="text-xs text-gray-500">{ref.customerEmail}</p>
                                </td>
                                <td className="px-4 py-3 text-gray-300">{ref.productName || 'Workshop'}</td>
                                <td className="px-4 py-3 text-white">₹{ref.saleAmount.toLocaleString()}</td>
                                <td className="px-4 py-3 text-green-400 font-medium">₹{ref.commissionAmount.toLocaleString()}</td>
                                <td className="px-4 py-3">{getStatusBadge(ref.status)}</td>
                                <td className="px-4 py-3 text-gray-400 text-sm">
                                  {new Date(ref.createdAt).toLocaleDateString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {affiliate.status === 'suspended' && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Account Suspended</p>
                    <p className="text-sm opacity-80">Your affiliate account has been suspended. Please contact support for assistance.</p>
                  </div>
                </div>
              )}

              {affiliate.status === 'rejected' && (
                <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-400 flex items-center gap-3">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Application Rejected</p>
                    <p className="text-sm opacity-80">Unfortunately, your affiliate application was not approved at this time.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
