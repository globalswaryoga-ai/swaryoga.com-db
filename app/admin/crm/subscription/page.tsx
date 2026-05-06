'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  Crown,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Sparkles,
  Loader2,
  AlertCircle,
  HardDrive,
  Users,
  MessageSquare,
  Zap,
  Calendar,
  RefreshCw,
  CreditCard,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Bot,
  Megaphone,
  FileText,
  BarChart3,
  Phone,
  GraduationCap,
  Mail,
  Layout,
  LifeBuoy,
  Workflow,
  Code,
  Globe,
  Mic,
} from 'lucide-react';
import {
  PlanTier,
  PLAN_ORDER,
  PLAN_PRICING,
  PLAN_LIMITS,
  PLAN_DISPLAY,
  PLAN_MODULES,
  CrmModule,
  FEATURE_CATALOG,
  formatLimit,
  getUpgradePlan,
} from '@/lib/crm-site/planConfig';

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
  trialStartDate?: string;
  trialEndDate?: string;
  isTrialActive?: boolean;
  trialDaysRemaining?: number;
}

export default function SubscriptionPage() {
  const token = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState('');
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  useEffect(() => {
    if (!token) return;
    fetchSubscription();
  }, [token]);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      if (!token) return;
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
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error || 'Failed to load subscription'}</p>
        <button onClick={fetchSubscription} className="mt-4 text-purple-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const currentPlan = (data.plan || 'free') as PlanTier;
  const currentDisplay = PLAN_DISPLAY[currentPlan] || PLAN_DISPLAY.free;
  const daysRemaining = data.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(data.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const storagePercent = Math.min(100, (data.storageUsedMB / Math.max(1, data.storageQuotaMB)) * 100);
  const leadsPercent = data.leadsQuota >= 999999 ? 0 : Math.min(100, (data.leadsUsed / Math.max(1, data.leadsQuota)) * 100);
  const usersPercent = data.usersQuota >= 999 ? 0 : Math.min(100, (data.usersCount / Math.max(1, data.usersQuota)) * 100);

  const upgradePlan = getUpgradePlan(currentPlan);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-20">
      {/* Trial Banner */}
      {data.isTrialActive && (
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Free Trial Active</h3>
                <p className="text-white/80 text-sm">
                  {data.trialDaysRemaining} days remaining — Upgrade anytime to keep your data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold">{data.trialDaysRemaining}</div>
                <div className="text-xs text-white/70">days left</div>
              </div>
              <Link
                href="/crm-site/checkout"
                className="px-4 py-2 bg-white text-purple-700 font-semibold rounded-xl hover:bg-gray-100 transition text-sm"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all"
              style={{ width: `${Math.max(5, ((data.trialDaysRemaining || 0) / 14) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Current Plan Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className={`bg-gradient-to-r ${currentDisplay.gradientFrom} ${currentDisplay.gradientTo} p-6 sm:p-8`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">{currentDisplay.name} Plan</h1>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium text-white">
                    {data.subscriptionStatus === 'active' ? 'Active' : 'Pending'}
                  </span>
                </div>
                <p className="text-white/80 text-sm mt-0.5">
                  {data.billing === 'annual' ? 'Annual' : data.billing === 'quarterly' ? 'Quarterly' : 'Monthly'} billing
                  {daysRemaining !== null && daysRemaining > 0 && ` • Renews in ${daysRemaining} days`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {upgradePlan && (
                <Link
                  href={`/crm-site/checkout?plan=${upgradePlan}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition text-sm"
                >
                  <Sparkles className="w-4 h-4" /> Upgrade
                </Link>
              )}
              <Link
                href="/crm-site/checkout?storage=true"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition text-sm"
              >
                <HardDrive className="w-4 h-4" /> Add Storage
              </Link>
            </div>
          </div>
        </div>

        {/* Usage Meters */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <UsageMeterCard
            icon={<HardDrive className="w-5 h-5 text-indigo-500" />}
            label="Storage"
            used={`${(data.storageUsedMB / 1024).toFixed(2)} GB`}
            limit={`${(data.storageQuotaMB / 1024).toFixed(1)} GB`}
            percent={storagePercent}
          />
          <UsageMeterCard
            icon={<MessageSquare className="w-5 h-5 text-emerald-500" />}
            label="Leads"
            used={data.leadsUsed.toLocaleString()}
            limit={data.leadsQuota >= 999999 ? 'Unlimited' : data.leadsQuota.toLocaleString()}
            percent={leadsPercent}
          />
          <UsageMeterCard
            icon={<Users className="w-5 h-5 text-purple-500" />}
            label="Team Members"
            used={data.usersCount.toString()}
            limit={data.usersQuota >= 999 ? 'Unlimited' : data.usersQuota.toString()}
            percent={usersPercent}
          />
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900">Compare Plans</h2>
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            {(['monthly', 'quarterly', 'annual'] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  billingCycle === cycle
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {cycle === 'monthly' ? 'Monthly' : cycle === 'quarterly' ? '3 Months' : 'Annual'}
                {cycle === 'annual' && <span className="text-emerald-600 ml-1">-20%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PLAN_ORDER.map((plan) => {
            const display = PLAN_DISPLAY[plan];
            const limits = PLAN_LIMITS[plan];
            const pricing = PLAN_PRICING[plan];
            const isCurrent = plan === currentPlan;
            const isUpgrade = PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(currentPlan);
            const price = billingCycle === 'annual'
              ? Math.round(pricing.annual / 12)
              : billingCycle === 'quarterly'
                ? Math.round(pricing.quarterly / 3)
                : (pricing.monthly ?? 0);
            const originalPrice = pricing.monthly ?? 0;

            return (
              <div
                key={plan}
                className={`relative bg-white rounded-2xl border-2 p-4 transition-all ${
                  isCurrent
                    ? `${display.borderColor} shadow-lg ring-2 ring-offset-2 ${display.borderColor.replace('border-', 'ring-')}`
                    : display.popular
                      ? 'border-purple-300 shadow-md'
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                {display.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-1 bg-gradient-to-r ${display.gradientFrom} ${display.gradientTo} text-white text-[10px] font-bold rounded-full uppercase tracking-wide`}>
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center pt-2 pb-3">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2 ${display.color}`}>
                    {plan === 'professional' || plan === 'growth' ? (
                      <Crown className={`w-5 h-5 ${display.textColor}`} />
                    ) : (
                      <Zap className={`w-5 h-5 ${display.textColor}`} />
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900">{display.name}</h3>
                  <p className="text-[11px] text-gray-500">{display.tagline}</p>
                </div>

                <div className="text-center py-3 border-y border-gray-100">
                  {plan === 'free' ? (
                    <div className="text-2xl font-bold text-gray-900">Free</div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">
                        ₹{price.toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-gray-500">/mo</span>
                      </div>
                      {billingCycle !== 'monthly' && price < originalPrice && (
                        <div className="text-xs text-gray-400 line-through">₹{originalPrice.toLocaleString('en-IN')}/mo</div>
                      )}
                    </>
                  )}
                </div>

                <div className="py-3 space-y-2">
                  <LimitRow label="Leads" value={formatLimit(limits.maxLeads)} />
                  <LimitRow label="Users" value={formatLimit(limits.maxUsers)} />
                  <LimitRow label="Storage" value={limits.storageQuotaMB >= 50000 ? '50GB' : `${(limits.storageQuotaMB / 1024).toFixed(0)}GB`} />
                  <LimitRow label="Broadcasts" value={limits.maxBroadcastsPerDay >= 999 ? 'Unlimited' : `${limits.maxBroadcastsPerDay}/day`} />
                </div>

                <div className="py-3 border-t border-gray-100 space-y-1.5">
                  {(['whatsapp', 'broadcasting', 'reports', 'aiCalls', 'community', 'automation'] as CrmModule[]).map((mod) => {
                    const hasIt = PLAN_MODULES[plan][mod];
                    return (
                      <div key={mod} className="flex items-center gap-1.5 text-xs">
                        {hasIt ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={hasIt ? 'text-gray-700' : 'text-gray-400'}>
                          {FEATURE_CATALOG.find(f => f.module === mod)?.name || mod}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3">
                  {isCurrent ? (
                    <div className={`text-center py-2.5 px-4 rounded-xl font-semibold text-sm ${display.color} ${display.textColor}`}>
                      Current Plan
                    </div>
                  ) : isUpgrade ? (
                    <Link
                      href={`/crm-site/checkout?plan=${plan}&billing=${billingCycle}`}
                      className={`block text-center py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r ${display.gradientFrom} ${display.gradientTo} hover:shadow-lg transition-all`}
                    >
                      Upgrade
                    </Link>
                  ) : (
                    <div className="text-center py-2.5 px-4 rounded-xl font-medium text-sm text-gray-400 bg-gray-50">
                      Included
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Features Comparison */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <button
          onClick={() => setShowAllFeatures(!showAllFeatures)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
        >
          <div>
            <h3 className="font-bold text-gray-900 text-left">All Features by Plan</h3>
            <p className="text-sm text-gray-500 text-left">Detailed comparison of every feature</p>
          </div>
          {showAllFeatures ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showAllFeatures && (
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 font-medium text-gray-500 w-48">Feature</th>
                  {PLAN_ORDER.map(plan => {
                    const d = PLAN_DISPLAY[plan];
                    const isCurrent = plan === currentPlan;
                    return (
                      <th key={plan} className={`text-center p-4 font-bold ${isCurrent ? d.textColor : 'text-gray-900'}`}>
                        {d.name}
                        {isCurrent && (
                          <span className="block text-[10px] font-normal text-gray-500">Current</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50">
                  <td colSpan={6} className="p-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                    Limits
                  </td>
                </tr>
                <FeatureRow label="Leads" values={PLAN_ORDER.map(p => formatLimit(PLAN_LIMITS[p].maxLeads))} currentPlan={currentPlan} />
                <FeatureRow label="Team Members" values={PLAN_ORDER.map(p => formatLimit(PLAN_LIMITS[p].maxUsers))} currentPlan={currentPlan} />
                <FeatureRow label="Storage" values={PLAN_ORDER.map(p => PLAN_LIMITS[p].storageQuotaMB >= 50000 ? '50 GB' : `${(PLAN_LIMITS[p].storageQuotaMB / 1024).toFixed(0)} GB`)} currentPlan={currentPlan} />
                <FeatureRow label="Broadcasts/day" values={PLAN_ORDER.map(p => PLAN_LIMITS[p].maxBroadcastsPerDay >= 999 ? 'Unlimited' : `${PLAN_LIMITS[p].maxBroadcastsPerDay}`)} currentPlan={currentPlan} />
                <FeatureRow label="Emails/month" values={PLAN_ORDER.map(p => formatLimit(PLAN_LIMITS[p].maxEmailsPerMonth))} currentPlan={currentPlan} />
                <FeatureRow label="Landing Pages" values={PLAN_ORDER.map(p => formatLimit(PLAN_LIMITS[p].maxLandingPages))} currentPlan={currentPlan} />
                <FeatureRow label="Automations" values={PLAN_ORDER.map(p => formatLimit(PLAN_LIMITS[p].maxAutomationWorkflows))} currentPlan={currentPlan} />
                <tr className="bg-gray-50">
                  <td colSpan={6} className="p-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                    Features
                  </td>
                </tr>
                {FEATURE_CATALOG.map((feature) => (
                  <FeatureCheckRow
                    key={feature.module}
                    label={feature.name}
                    values={PLAN_ORDER.map(p => PLAN_MODULES[p][feature.module])}
                    currentPlan={currentPlan}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Billing & Payments</h3>
            <p className="text-sm text-gray-500">View invoices, receipts and manage billing</p>
          </div>
          <Link
            href="/admin/crm/billing-history"
            className="flex items-center gap-1 text-purple-600 text-sm font-medium hover:underline"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.lastPaymentDate && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Last Payment</p>
                  <p className="font-semibold text-gray-900">
                    ₹{data.lastPaymentAmount?.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(data.lastPaymentDate).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-gray-300" />
              </div>
            </div>
          )}

          {data.autopayEnabled && (
            <div className="p-4 bg-emerald-50 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-emerald-600">Auto-Renewal</p>
                  <p className="font-semibold text-emerald-700">Enabled</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    via {data.paymentMethod?.toUpperCase() || 'UPI'}
                  </p>
                </div>
                <RefreshCw className="w-8 h-8 text-emerald-300" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help footer */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Need help?{' '}
          <a href="https://wa.me/919779006820" className="text-purple-600 hover:underline">Chat with us on WhatsApp</a>
          {' '}or email{' '}
          <a href="mailto:support@swaryoga.com" className="text-purple-600 hover:underline">support@swaryoga.com</a>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function UsageMeterCard({ icon, label, used, limit, percent }: {
  icon: React.ReactNode;
  label: string;
  used: string;
  limit: string;
  percent: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gray-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{used} of {limit}</p>
        </div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percent > 90
              ? 'bg-gradient-to-r from-red-400 to-red-600'
              : percent > 70
                ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
          }`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      {percent > 80 && (
        <p className="mt-2 text-[11px] text-amber-600 font-medium">
          {percent > 90 ? '⚠️ Almost at limit — consider upgrading' : '📊 Getting close to limit'}
        </p>
      )}
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function FeatureRow({ label, values, currentPlan }: { label: string; values: string[]; currentPlan: PlanTier }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="p-3 text-gray-700">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`p-3 text-center font-medium ${
            PLAN_ORDER[i] === currentPlan ? 'bg-purple-50/50 text-purple-700' : 'text-gray-900'
          }`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

function FeatureCheckRow({ label, values, currentPlan }: { label: string; values: boolean[]; currentPlan: PlanTier }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="p-3 text-gray-700">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`p-3 text-center ${
            PLAN_ORDER[i] === currentPlan ? 'bg-purple-50/50' : ''
          }`}
        >
          {v ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
          )}
        </td>
      ))}
    </tr>
  );
}
