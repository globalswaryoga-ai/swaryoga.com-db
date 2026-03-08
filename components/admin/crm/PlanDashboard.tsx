'use client';

import React from 'react';
import {
  Users,
  MessageSquare,
  TrendingUp,
  Send,
  Phone,
  FileText,
  Settings,
  Zap,
  BarChart2,
  Crown,
  Lock,
} from 'lucide-react';

interface PlanFeature {
  id: string;
  name: string;
  icon: React.ReactNode;
  href: string;
  availableIn: ('starter' | 'growth' | 'pro')[];
  badge?: string;
}

const FEATURES: PlanFeature[] = [
  {
    id: 'leads',
    name: 'Lead Management',
    icon: <Users className="h-5 w-5" />,
    href: '/admin/crm/leads',
    availableIn: ['starter', 'growth', 'pro'],
  },
  {
    id: 'messages',
    name: 'WhatsApp Messages',
    icon: <MessageSquare className="h-5 w-5" />,
    href: '/admin/crm/inbox',
    availableIn: ['starter', 'growth', 'pro'],
  },
  {
    id: 'broadcasts',
    name: 'Broadcast Messages',
    icon: <Send className="h-5 w-5" />,
    href: '/admin/crm/broadcasts',
    availableIn: ['growth', 'pro'],
    badge: 'Growth+',
  },
  {
    id: 'calls',
    name: 'AI Voice Calls',
    icon: <Phone className="h-5 w-5" />,
    href: '/admin/crm/calls',
    availableIn: ['pro'],
    badge: 'Pro',
  },
  {
    id: 'analytics',
    name: 'Advanced Analytics',
    icon: <BarChart2 className="h-5 w-5" />,
    href: '/admin/crm/analytics',
    availableIn: ['growth', 'pro'],
    badge: 'Growth+',
  },
  {
    id: 'automation',
    name: 'Workflow Automation',
    icon: <Zap className="h-5 w-5" />,
    href: '/admin/crm/automation',
    availableIn: ['pro'],
    badge: 'Pro',
  },
  {
    id: 'reports',
    name: 'Custom Reports',
    icon: <FileText className="h-5 w-5" />,
    href: '/admin/crm/reports',
    availableIn: ['growth', 'pro'],
    badge: 'Growth+',
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/admin/crm/settings',
    availableIn: ['starter', 'growth', 'pro'],
  },
];

interface PlanDashboardProps {
  planId: 'starter' | 'growth' | 'pro' | '';
  planName: string;
  storageUsedMB: number;
  storageLimitMB: number;
  leadsCount: number;
  messagesCount: number;
  onUpgrade: () => void;
}

/**
 * PlanDashboard - Shows different features based on user's plan
 */
export default function PlanDashboard({
  planId = 'starter',
  planName,
  storageUsedMB,
  storageLimitMB,
  leadsCount,
  messagesCount,
  onUpgrade,
}: PlanDashboardProps) {
  const currentPlan = planId || 'starter';
  const usagePercent = Math.min((storageUsedMB / storageLimitMB) * 100, 100);

  const isFeatureAvailable = (feature: PlanFeature) => {
    return feature.availableIn.includes(currentPlan as any);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Plan Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6" />
              <h2 className="text-xl font-bold">{planName || 'Starter'} Plan</h2>
            </div>
            <p className="text-indigo-100 mt-1">
              {currentPlan === 'starter' && 'Basic features for getting started'}
              {currentPlan === 'growth' && 'Advanced features for growing businesses'}
              {currentPlan === 'pro' && 'All features unlocked - enterprise ready'}
            </p>
          </div>
          {currentPlan !== 'pro' && (
            <button
              onClick={onUpgrade}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Upgrade
            </button>
          )}
        </div>

        {/* Storage Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-indigo-100 mb-1">
            <span>Storage Used</span>
            <span>{storageUsedMB.toFixed(1)} MB / {storageLimitMB} MB</span>
          </div>
          <div className="w-full h-2 bg-indigo-400/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 90 ? 'bg-red-400' : 'bg-white'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-gray-500 text-sm">Total Leads</div>
          <div className="text-2xl font-bold text-gray-900">{leadsCount}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-gray-500 text-sm">Messages</div>
          <div className="text-2xl font-bold text-gray-900">{messagesCount}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-gray-500 text-sm">Storage</div>
          <div className="text-2xl font-bold text-gray-900">{usagePercent.toFixed(0)}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-gray-500 text-sm">Plan</div>
          <div className="text-2xl font-bold text-indigo-600">{planName || 'Starter'}</div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature) => {
            const available = isFeatureAvailable(feature);
            return (
              <a
                key={feature.id}
                href={available ? feature.href : '#'}
                onClick={(e) => {
                  if (!available) {
                    e.preventDefault();
                    onUpgrade();
                  }
                }}
                className={`relative bg-white rounded-xl p-4 shadow-sm border transition-all ${
                  available
                    ? 'hover:shadow-md hover:border-indigo-200 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                {!available && (
                  <div className="absolute top-2 right-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                {feature.badge && (
                  <div className="absolute -top-2 -right-2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {feature.badge}
                    </span>
                  </div>
                )}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    available ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {feature.icon}
                </div>
                <h4 className={`font-medium ${available ? 'text-gray-900' : 'text-gray-500'}`}>
                  {feature.name}
                </h4>
              </a>
            );
          })}
        </div>
      </div>

      {/* Upgrade CTA for non-pro users */}
      {currentPlan !== 'pro' && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Crown className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Unlock More Features</h4>
              <p className="text-gray-600 text-sm mt-1">
                {currentPlan === 'starter'
                  ? 'Upgrade to Growth plan for broadcasts, analytics, and custom reports.'
                  : 'Upgrade to Professional plan for AI voice calls and workflow automation.'}
              </p>
              <button
                onClick={onUpgrade}
                className="mt-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
              >
                View All Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
