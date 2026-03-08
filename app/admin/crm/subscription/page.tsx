'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Zap,
  HardDrive,
  Users,
  MessageSquare,
  Crown,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface SubscriptionData {
  tenantSlug: string;
  plan: string;
  billing: string;
  subscriptionStatus: string;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  storageUsedMB: number;
  storageQuotaMB: number;
  leadsUsed: number;
  leadsQuota: number;
  usersCount: number;
  usersQuota: number;
  paymentMethod?: string;
  autopayEnabled?: boolean;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

const PLAN_INFO: Record<string, { name: string; color: string; icon: any; features: string[] }> = {
  free: {
    name: 'Free',
    color: 'bg-gray-100 text-gray-700',
    icon: Zap,
    features: ['250 leads', '1 user', '100MB storage', 'Basic chatbot'],
  },
  basic: {
    name: 'Basic',
    color: 'bg-blue-100 text-blue-700',
    icon: Zap,
    features: ['2,000 leads', '2 users', '500MB storage', 'WhatsApp API', 'Broadcast'],
  },
  starter: {
    name: 'Starter',
    color: 'bg-green-100 text-green-700',
    icon: Zap,
    features: ['5,000 leads', '3 users', '1GB storage', 'Reports', 'Templates'],
  },
  growth: {
    name: 'Growth',
    color: 'bg-purple-100 text-purple-700',
    icon: Crown,
    features: ['25,000 leads', '10 users', '5GB storage', 'AI Calls', 'Community'],
  },
  professional: {
    name: 'Professional',
    color: 'bg-amber-100 text-amber-700',
    icon: Crown,
    features: ['Unlimited leads', 'Unlimited users', '50GB storage', 'All features'],
  },
};

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const json = await res.json();
      setData(json.subscription);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-swar-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error || 'Failed to load subscription'}</p>
        <button onClick={fetchSubscription} className="mt-4 text-swar-primary hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const planInfo = PLAN_INFO[data.plan] || PLAN_INFO.free;
  const PlanIcon = planInfo.icon;
  const daysRemaining = data.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(data.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const storagePercent = Math.min(100, (data.storageUsedMB / data.storageQuotaMB) * 100);
  const leadsPercent = Math.min(100, (data.leadsUsed / data.leadsQuota) * 100);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-sm text-gray-500">Manage your CRM plan and billing</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${planInfo.color}`}>
              <PlanIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{planInfo.name} Plan</h2>
              <p className="text-sm text-gray-500">
                {data.billing === 'annual' ? 'Annual' : data.billing === 'quarterly' ? 'Quarterly' : 'Monthly'} billing
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            data.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {data.subscriptionStatus === 'active' ? 'Active' : 'Pending'}
          </span>
        </div>

        {daysRemaining !== null && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {daysRemaining > 0
                ? `Renews in ${daysRemaining} days (${new Date(data.subscriptionEndDate!).toLocaleDateString('en-IN')})`
                : 'Subscription ended'}
            </span>
          </div>
        )}

        {data.autopayEnabled && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4 text-green-500" />
            <span className="text-green-600">Auto-renewal enabled via {data.paymentMethod?.toUpperCase() || 'UPI'}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Storage Usage */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Storage</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {(data.storageUsedMB / 1024).toFixed(2)} / {(data.storageQuotaMB / 1024).toFixed(1)} GB
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>

          {/* Leads Usage */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Leads</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {data.leadsUsed.toLocaleString()} / {data.leadsQuota.toLocaleString()}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${leadsPercent > 90 ? 'bg-red-500' : leadsPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${leadsPercent}%` }}
              />
            </div>
          </div>

          {/* Users */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Team</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {data.usersCount} / {data.usersQuota === 999 ? '∞' : data.usersQuota}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active users</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {data.plan !== 'professional' && (
            <Link
              href="/crm-site/checkout"
              className="flex items-center gap-2 px-4 py-2 bg-swar-primary text-white text-sm font-semibold rounded-xl hover:bg-swar-primary-hover transition"
            >
              <Zap className="w-4 h-4" /> Upgrade Plan
            </Link>
          )}
          <Link
            href="/crm-site/checkout?storage=true"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition"
          >
            <HardDrive className="w-4 h-4" /> Add Storage
          </Link>
        </div>
      </div>

      {/* Plan Features */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Plan Includes</h3>
        <div className="grid grid-cols-2 gap-3">
          {planInfo.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Payment History Link */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Payment History</h3>
            <p className="text-sm text-gray-500">View all invoices and receipts</p>
          </div>
          <Link
            href="/admin/crm/billing-history"
            className="flex items-center gap-1 text-swar-primary text-sm font-medium hover:underline"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {data.lastPaymentDate && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Last Payment</p>
                <p className="font-medium text-gray-900">
                  ₹{data.lastPaymentAmount?.toLocaleString('en-IN')} on{' '}
                  {new Date(data.lastPaymentDate).toLocaleDateString('en-IN')}
                </p>
              </div>
              <CreditCard className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
