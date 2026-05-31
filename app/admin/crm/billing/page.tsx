'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, HardDrive, Users, MessageSquare, Crown,
  Zap, CheckCircle2, CreditCard, Calendar, TrendingUp,
  Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionData {
  plan: string;
  billing: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  storageUsedMB: number;
  storageQuotaMB: number;
  leadsUsed: number;
  leadsQuota: number;
  usersCount: number;
  usersQuota: number;
  isTrialActive?: boolean;
  trialDaysRemaining?: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

interface DbPlan {
  tier: string;
  name: string;
  description: string;
  monthlyPriceINR: number;
  annualPriceINR: number;
  quarterlyPriceINR: number;
  limits: { maxLeads: number; maxUsers: number; maxStorageMB: number; maxBroadcastsPerDay: number };
  defaultGroups: string[];
  trialDays: number;
  promoCode: string;
  discountPercent: number;
}

const COLORS = [
  { border: 'border-sky-300',    bg: 'bg-sky-50',    text: 'text-sky-700',    btn: 'bg-sky-600 hover:bg-sky-700',       badge: 'bg-sky-600' },
  { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700', btn: 'bg-orange-500 hover:bg-orange-600', badge: 'bg-orange-500' },
  { border: 'border-indigo-300', bg: 'bg-indigo-50', text: 'text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700', badge: 'bg-indigo-600' },
  { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', badge: 'bg-purple-600' },
  { border: 'border-amber-300',  bg: 'bg-amber-50',  text: 'text-amber-700',  btn: 'bg-amber-500 hover:bg-amber-600',   badge: 'bg-amber-500' },
];

export default function BillingPage() {
  const token = useAuth();
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cycle, setCycle] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch('/api/crm-site/subscription', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.subscription ? setSub(d.subscription) : null),
      fetch('/api/admin/tenants/plans')
        .then(r => r.json())
        .then(d => {
          const sorted = (d?.data?.plans || []).sort((a: DbPlan, b: DbPlan) => a.monthlyPriceINR - b.monthlyPriceINR);
          setPlans(sorted);
        }),
    ])
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const storagePercent = sub ? Math.min(100, (sub.storageUsedMB / Math.max(1, sub.storageQuotaMB)) * 100) : 0;
  const leadsPercent   = sub && sub.leadsQuota < 999999 ? Math.min(100, (sub.leadsUsed / Math.max(1, sub.leadsQuota)) * 100) : 0;
  const daysLeft = sub?.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(sub.subscriptionEndDate).getTime() - Date.now()) / 86400000))
    : null;
  const currentIdx = plans.findIndex(p => p.tier === sub?.plan);

  const getPrice = (p: DbPlan) => {
    if (cycle === 'annual') return Math.round((p.annualPriceINR || p.monthlyPriceINR * 12) / 12);
    if (cycle === 'quarterly') return Math.round((p.quarterlyPriceINR || p.monthlyPriceINR * 3) / 3);
    return p.monthlyPriceINR;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-red-600">{error}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-20 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/crm" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
          <p className="text-sm text-gray-500">Manage your subscription, storage and billing</p>
        </div>
      </div>

      {/* Trial Banner */}
      {sub?.isTrialActive && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bold text-lg">Free Trial Active</p>
            <p className="text-white/80 text-sm">{sub.trialDaysRemaining} days remaining — upgrade to keep your data</p>
          </div>
          <Link href="/crm-site/checkout" className="px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl text-sm hover:bg-gray-100 transition">
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Usage Cards */}
      {sub && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Storage — MB + Buy Now */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-50 rounded-xl"><HardDrive className="w-5 h-5 text-indigo-600" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Storage</p>
                <p className="text-xs text-gray-500">{sub.storageUsedMB} MB of {sub.storageQuotaMB} MB</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
              <div className={`h-full rounded-full ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.max(2, storagePercent)}%` }} />
            </div>
            <Link href="/crm-site/checkout?storage=true"
              className="block text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition">
              Buy More Storage
            </Link>
          </div>

          {/* Leads */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-xl"><MessageSquare className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Leads</p>
                <p className="text-xs text-gray-500">{sub.leadsUsed.toLocaleString()} of {sub.leadsQuota >= 999999 ? 'Unlimited' : sub.leadsQuota.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
              <div className={`h-full rounded-full ${leadsPercent > 90 ? 'bg-red-500' : leadsPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.max(2, leadsPercent)}%` }} />
            </div>
            <div className="text-xs text-gray-500 text-center">{leadsPercent.toFixed(0)}% used</div>
          </div>

          {/* Renewal */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-xl"><Calendar className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Next Renewal</p>
                <p className="text-xs text-gray-500">{daysLeft !== null ? `${daysLeft} days remaining` : 'No active plan'}</p>
              </div>
            </div>
            {sub.subscriptionEndDate && (
              <p className="text-lg font-bold text-gray-800">
                {new Date(sub.subscriptionEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
            {sub.lastPaymentAmount && (
              <p className="text-xs text-gray-500 mt-1">Last paid: ₹{sub.lastPaymentAmount.toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Plan Comparison */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-lg font-bold text-gray-900">All Plans</h2>
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            {(['monthly', 'quarterly', 'annual'] as const).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${cycle === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {c === 'monthly' ? 'Monthly' : c === 'quarterly' ? '3 Months' : 'Annual'}
                {c === 'annual' && <span className="text-emerald-600 ml-1">Save 20%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(5, plans.length)} gap-4`}>
          {plans.map((p, idx) => {
            const color = COLORS[idx % COLORS.length];
            const isCurrent = p.tier === sub?.plan;
            const isUpgrade = idx > currentIdx;
            const price = getPrice(p);
            const bundles = p.defaultGroups?.length ?? 0;

            return (
              <div key={p.tier} className={`relative bg-white rounded-2xl border-2 p-5 transition-all ${isCurrent ? `${color.border} shadow-lg` : 'border-gray-100 hover:shadow-sm'}`}>
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-0.5 ${color.badge} text-white text-[10px] font-bold rounded-full uppercase tracking-wide`}>
                      Current
                    </span>
                  </div>
                )}
                {p.trialDays > 0 && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                      {p.trialDays}-day trial
                    </span>
                  </div>
                )}

                <div className="text-center pt-2 pb-3">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2 ${color.bg}`}>
                    <Zap className={`w-5 h-5 ${color.text}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </div>

                <div className="text-center py-3 border-y border-gray-100 mb-3">
                  {p.monthlyPriceINR === 0 ? (
                    <span className="text-2xl font-bold text-gray-900">Free</span>
                  ) : (
                    <span className="text-2xl font-bold text-gray-900">
                      ₹{price.toLocaleString()}<span className="text-xs font-normal text-gray-500">/mo</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">Leads</span><span className="font-semibold">{(p.limits?.maxLeads ?? 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Users</span><span className="font-semibold">{p.limits?.maxUsers ?? 1}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Storage</span><span className="font-semibold">{p.limits?.maxStorageMB ?? 0} MB</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Modules</span><span className="font-semibold">{bundles}</span></div>
                  {p.discountPercent > 0 && (
                    <div className="flex justify-between text-rose-600"><span>Discount</span><span className="font-semibold">{p.discountPercent}% off{p.promoCode ? ` (${p.promoCode})` : ''}</span></div>
                  )}
                </div>

                {isCurrent ? (
                  <div className={`text-center py-2 rounded-xl text-sm font-semibold ${color.bg} ${color.text}`}>Current Plan</div>
                ) : isUpgrade ? (
                  <Link href={`/crm-site/checkout?plan=${p.tier}&billing=${cycle}`}
                    className={`block text-center py-2 rounded-xl text-sm font-semibold text-white ${color.btn} transition`}>
                    Upgrade Now
                  </Link>
                ) : (
                  <div className="text-center py-2 rounded-xl text-sm text-gray-400 bg-gray-50">Previous Plan</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing History Link */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">Billing History</p>
          <p className="text-sm text-gray-500">View all invoices and payment records</p>
        </div>
        <Link href="/admin/crm/billing-history" className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          View History →
        </Link>
      </div>

      {/* Help */}
      <p className="text-center text-sm text-gray-400">
        Need help?{' '}
        <a href="https://wa.me/919779006820" className="text-indigo-600 hover:underline">WhatsApp us</a>
        {' '}or{' '}
        <a href="mailto:support@swaryoga.com" className="text-indigo-600 hover:underline">email support</a>
      </p>
    </div>
  );
}
