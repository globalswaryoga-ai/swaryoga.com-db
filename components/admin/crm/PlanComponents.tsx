'use client';

import React from 'react';
import { Lock, ArrowUpRight, Sparkles, CheckCircle2, Crown } from 'lucide-react';
import Link from 'next/link';
import { usePlan } from './hooks/usePlan';
import {
  CrmModule,
  PlanTier,
  PLAN_NAMES,
  PLAN_DISPLAY,
  getMinimumPlan,
  getPlanDisplay,
  PLAN_PRICING,
  formatLimit,
  PLAN_LIMITS,
} from '@/lib/crm-site/planConfig';

// ============================================================================
// PLAN GATE - Wraps content, shows upgrade prompt if module not in plan
// ============================================================================

interface PlanGateProps {
  module: CrmModule;
  children: React.ReactNode;
  /** Custom title for the gate */
  title?: string;
  /** Show inline (small) or full-page gate */
  variant?: 'inline' | 'page' | 'overlay';
  /** Fallback content when gated (default: UpgradePrompt) */
  fallback?: React.ReactNode;
}

export function PlanGate({ module, children, title, variant = 'page', fallback }: PlanGateProps) {
  const { canAccess, plan, isSuperAdmin, loading } = usePlan();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Superadmins and users with access pass through
  if (isSuperAdmin || canAccess(module)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  const requiredPlan = getMinimumPlan(module);

  if (variant === 'inline') {
    return <UpgradeInline module={module} requiredPlan={requiredPlan} title={title} />;
  }

  if (variant === 'overlay') {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-20 blur-[2px] select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <UpgradeCard module={module} requiredPlan={requiredPlan} currentPlan={plan} />
        </div>
      </div>
    );
  }

  // Full page gate
  return <UpgradeFullPage module={module} requiredPlan={requiredPlan} currentPlan={plan} title={title} />;
}

// ============================================================================
// UPGRADE PROMPT COMPONENTS
// ============================================================================

interface UpgradeCardProps {
  module: CrmModule;
  requiredPlan: PlanTier;
  currentPlan: PlanTier;
}

export function UpgradeCard({ module, requiredPlan, currentPlan }: UpgradeCardProps) {
  const display = getPlanDisplay(requiredPlan);
  const price = PLAN_PRICING[requiredPlan];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-sm w-full">
      <div className="text-center">
        <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${display.gradientFrom} ${display.gradientTo} flex items-center justify-center mb-4`}>
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Upgrade to {display.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          This feature requires the {display.name} plan or higher
        </p>

        <div className="mb-4">
          <div className="text-3xl font-bold text-gray-900">
            ₹{price.monthly.toLocaleString('en-IN')}
            <span className="text-sm font-normal text-gray-500">/mo</span>
          </div>
        </div>

        <Link
          href={`/crm-site/checkout?plan=${requiredPlan}`}
          className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-white font-semibold bg-gradient-to-r ${display.gradientFrom} ${display.gradientTo} hover:shadow-lg transition-all`}
        >
          <Sparkles className="w-4 h-4" />
          Upgrade Now
          <ArrowUpRight className="w-4 h-4" />
        </Link>

        <Link
          href="/admin/crm/subscription"
          className="mt-3 block text-sm text-gray-500 hover:text-gray-700"
        >
          Compare all plans →
        </Link>
      </div>
    </div>
  );
}

interface UpgradeInlineProps {
  module: CrmModule;
  requiredPlan: PlanTier;
  title?: string;
}

function UpgradeInline({ module, requiredPlan, title }: UpgradeInlineProps) {
  const display = getPlanDisplay(requiredPlan);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${display.borderColor} ${display.color}`}>
      <Lock className={`w-4 h-4 flex-shrink-0 ${display.textColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${display.textColor}`}>
          {title || 'Feature locked'}
        </p>
        <p className="text-xs text-gray-500">
          Upgrade to {display.name} to unlock
        </p>
      </div>
      <Link
        href={`/crm-site/checkout?plan=${requiredPlan}`}
        className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-gradient-to-r ${display.gradientFrom} ${display.gradientTo}`}
      >
        Upgrade
      </Link>
    </div>
  );
}

interface UpgradeFullPageProps {
  module: CrmModule;
  requiredPlan: PlanTier;
  currentPlan: PlanTier;
  title?: string;
}

function UpgradeFullPage({ module, requiredPlan, currentPlan, title }: UpgradeFullPageProps) {
  const display = getPlanDisplay(requiredPlan);
  const currentDisplay = getPlanDisplay(currentPlan);
  const requiredLimits = PLAN_LIMITS[requiredPlan];
  const price = PLAN_PRICING[requiredPlan];

  const featureHighlights = getModuleFeatures(module);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-6">
      <div className="max-w-lg w-full">
        {/* Current plan badge */}
        <div className="text-center mb-6">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${currentDisplay.color} ${currentDisplay.textColor}`}>
            Your plan: {currentDisplay.name}
          </span>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header gradient */}
          <div className={`bg-gradient-to-r ${display.gradientFrom} ${display.gradientTo} p-8 text-center`}>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {title || 'Unlock this feature'}
            </h2>
            <p className="text-white/80 text-sm">
              Available on {display.name} plan and above
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* What you get */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              What you&apos;ll get with {display.name}
            </h3>
            <div className="space-y-3 mb-8">
              {featureHighlights.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${display.textColor}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{feature.title}</p>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Limits comparison */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{formatLimit(requiredLimits.maxLeads)}</p>
                <p className="text-xs text-gray-500">Leads</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{formatLimit(requiredLimits.maxUsers)}</p>
                <p className="text-xs text-gray-500">Users</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{(requiredLimits.storageQuotaMB / 1024).toFixed(0)}GB</p>
                <p className="text-xs text-gray-500">Storage</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{requiredLimits.maxBroadcastsPerDay}</p>
                <p className="text-xs text-gray-500">Broadcasts/day</p>
              </div>
            </div>

            {/* Price + CTA */}
            <div className="text-center">
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">₹{price.monthly.toLocaleString('en-IN')}</span>
                <span className="text-gray-500">/month</span>
              </div>
              <Link
                href={`/crm-site/checkout?plan=${requiredPlan}`}
                className={`flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-white font-semibold bg-gradient-to-r ${display.gradientFrom} ${display.gradientTo} hover:shadow-lg hover:scale-[1.02] transition-all`}
              >
                <Crown className="w-5 h-5" />
                Upgrade to {display.name}
              </Link>
              <Link
                href="/admin/crm/subscription"
                className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-700"
              >
                Compare all plans →
              </Link>
            </div>
          </div>
        </div>

        {/* Trial callout */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            14-day free trial available • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PLAN BADGE - Shows current plan in sidebar/header
// ============================================================================

interface PlanBadgeProps {
  variant?: 'sidebar' | 'header' | 'compact';
  className?: string;
}

export function PlanBadge({ variant = 'sidebar', className = '' }: PlanBadgeProps) {
  const { plan, planName, display, isTrialActive, trialDaysRemaining, isSuperAdmin, loading } = usePlan();

  if (loading || isSuperAdmin) return null;

  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${display.color} ${display.textColor} ${className}`}>
        {display.badge}
      </span>
    );
  }

  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${display.color} ${display.textColor}`}>
          {display.badge}
        </span>
        {isTrialActive && (
          <span className="text-[10px] text-orange-600 font-medium">
            {trialDaysRemaining}d trial
          </span>
        )}
      </div>
    );
  }

  // Sidebar variant (larger with upgrade link)
  return (
    <div className={`mx-3 mb-2 ${className}`}>
      <Link href="/admin/crm/subscription" className="block">
        <div className={`rounded-xl p-3 border ${display.borderColor} ${display.color} hover:shadow-sm transition-all group`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold ${display.textColor}`}>
              {planName} Plan
            </span>
            {plan !== 'professional' && (
              <span className="text-[10px] text-gray-500 group-hover:text-gray-700 flex items-center gap-0.5">
                Upgrade <ArrowUpRight className="w-3 h-3" />
              </span>
            )}
          </div>
          {isTrialActive && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-white/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${display.gradientFrom} ${display.gradientTo}`}
                  style={{ width: `${Math.max(5, (trialDaysRemaining / 14) * 100)}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${display.textColor}`}>
                {trialDaysRemaining}d left
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

// ============================================================================
// TRIAL BANNER - Shown at top when trial is active
// ============================================================================

interface TrialBannerProps {
  className?: string;
}

export function TrialBanner({ className = '' }: TrialBannerProps) {
  const { isTrialActive, trialDaysRemaining, plan, isSuperAdmin, loading } = usePlan();

  if (loading || isSuperAdmin || !isTrialActive) return null;

  const urgent = trialDaysRemaining <= 3;

  return (
    <div className={`px-4 py-2 text-center text-sm font-medium ${
      urgent
        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
        : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
    } ${className}`}>
      <div className="flex items-center justify-center gap-3">
        <Sparkles className="w-4 h-4" />
        <span>
          {urgent
            ? `Your trial expires in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}! `
            : `${trialDaysRemaining} days remaining in your free trial. `}
        </span>
        <Link
          href="/admin/crm/subscription"
          className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition"
        >
          Upgrade Now <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// USAGE METER - Shows resource usage with color coding
// ============================================================================

interface UsageMeterProps {
  resource: 'leads' | 'users' | 'storageMB';
  label: string;
  className?: string;
}

export function UsageMeter({ resource, label, className = '' }: UsageMeterProps) {
  const { usage, limits, usagePercent: getPercent, formatLimit: fmt } = usePlan();

  const used = usage[resource] || 0;
  let limit = 0;
  switch (resource) {
    case 'leads': limit = limits.maxLeads; break;
    case 'users': limit = limits.maxUsers; break;
    case 'storageMB': limit = limits.storageQuotaMB; break;
  }

  const percent = getPercent(resource);
  const isUnlimited = limit >= 999999;

  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-medium text-gray-900">
          {resource === 'storageMB'
            ? `${(used / 1024).toFixed(1)} / ${isUnlimited ? '∞' : `${(limit / 1024).toFixed(0)}`} GB`
            : `${used.toLocaleString()} / ${isUnlimited ? '∞' : fmt(limit)}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(2, percent)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SIDEBAR LOCK ICON - For locked sidebar items
// ============================================================================

interface SidebarLockProps {
  module: CrmModule;
}

export function SidebarLock({ module }: SidebarLockProps) {
  const { canAccess, loading } = usePlan();

  if (loading) return null;
  if (canAccess(module)) return null;

  return (
    <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
  );
}

// ============================================================================
// HELPER: Module-specific feature highlights for upgrade page
// ============================================================================

function getModuleFeatures(module: CrmModule): { title: string; description: string }[] {
  const features: Record<CrmModule, { title: string; description: string }[]> = {
    leads: [
      { title: 'Advanced Lead Management', description: 'Tags, custom fields, funnel tracking' },
      { title: 'Lead Import/Export', description: 'CSV import, bulk operations' },
    ],
    whatsapp: [
      { title: 'WhatsApp Business API', description: 'Send & receive messages via Meta Business API' },
      { title: 'Conversation Inbox', description: 'Unified inbox for all WhatsApp chats' },
      { title: 'Auto-Reply', description: 'Set up automated responses to common questions' },
    ],
    broadcasting: [
      { title: 'Bulk WhatsApp Messages', description: 'Send campaigns to thousands of contacts' },
      { title: 'Template Messages', description: 'Use pre-approved WhatsApp templates' },
      { title: 'Scheduled Broadcasts', description: 'Schedule messages for optimal timing' },
    ],
    chatbot: [
      { title: 'Chatbot Builder', description: 'Create automated conversation flows' },
      { title: 'Keyword Triggers', description: 'Auto-respond based on keywords' },
    ],
    aiCalls: [
      { title: 'AI Voice Calling', description: 'Automated outbound calls with AI agents' },
      { title: 'Call Scripts', description: 'Customizable AI call scripts' },
      { title: 'Call Analytics', description: 'Track call outcomes and performance' },
    ],
    reports: [
      { title: 'Performance Dashboard', description: 'Real-time team and sales analytics' },
      { title: 'Conversion Reports', description: 'Track lead-to-sale conversion rates' },
      { title: 'Export Reports', description: 'Download reports as PDF/CSV' },
    ],
    community: [
      { title: 'Online Courses', description: 'Host and sell online courses' },
      { title: 'Community Forum', description: 'Build a learning community' },
      { title: 'Certificates', description: 'Issue completion certificates' },
    ],
    templates: [
      { title: 'Message Templates', description: 'Pre-approved WhatsApp message templates' },
      { title: 'Template Analytics', description: 'Track template performance' },
    ],
    callRecording: [
      { title: 'Call Recording', description: 'Record and review customer calls' },
      { title: 'Call Transcription', description: 'AI-powered call transcripts' },
    ],
    emailMarketing: [
      { title: 'Email Campaigns', description: 'Send marketing emails to your leads' },
      { title: 'Drip Sequences', description: 'Automated email follow-up series' },
      { title: 'Email Analytics', description: 'Track opens, clicks, and conversions' },
    ],
    landingPages: [
      { title: 'Landing Page Builder', description: 'Create beautiful lead capture pages' },
      { title: 'Form Builder', description: 'Custom forms with auto-lead creation' },
    ],
    automation: [
      { title: 'Workflow Automation', description: 'Trigger actions based on events' },
      { title: 'Auto Lead Assignment', description: 'Round-robin lead distribution' },
      { title: 'Custom Triggers', description: 'Build complex automation rules' },
    ],
    helpdesk: [
      { title: 'Ticket System', description: 'Track and resolve customer issues' },
      { title: 'SLA Management', description: 'Set response time targets' },
    ],
    api: [
      { title: 'REST API Access', description: 'Full API for custom integrations' },
      { title: 'Webhooks', description: 'Real-time event notifications' },
    ],
    customDomain: [
      { title: 'Custom Domain', description: 'Use your own domain (crm.yourbusiness.com)' },
      { title: 'White-label', description: 'Remove Swar Yoga branding' },
    ],
  };

  return features[module] || [
    { title: 'Premium Feature', description: 'Upgrade your plan to unlock this feature' },
  ];
}
