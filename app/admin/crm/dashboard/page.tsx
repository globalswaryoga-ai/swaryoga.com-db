'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  MessageSquare,
  TrendingUp,
  Radio,
  Clock,
  Target,
  BarChart3,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Plug,
  Bot,
  Mail,
  Globe,
  Heart,
  Star,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  CalendarDays,
  Shield,
  Megaphone,
  Layout,
  GraduationCap,
  Settings,
} from 'lucide-react';

interface AnalyticsData {
  period: string;
  tenant: {
    name: string;
    plan: string;
    leadsUsed: number;
    leadsLimit: number;
  } | null;
  summary: {
    totalLeads: number;
    newLeads: number;
    growthRate: number;
    totalMessages: number;
    recentMessages: number;
    totalBroadcasts: number;
    recentBroadcasts: number;
    conversionRate: number;
    avgResponseTimeMinutes: number | null;
  };
  charts: {
    dailyLeads: { date: string; count: number }[];
    leadsByStatus: { status: string; count: number }[];
    leadsBySource: { source: string; count: number }[];
  };
  topAgents: { agentId: string; leads: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#10b981',
  converted: '#22c55e',
  lost: '#ef4444',
  nurturing: '#8b5cf6',
  Unknown: '#9ca3af',
};

const QUICK_ACTIONS = [
  { icon: Users, label: 'Add Lead', href: '/admin/crm/funnel', color: 'bg-blue-500', desc: 'Create new contact' },
  { icon: MessageSquare, label: 'Send Message', href: '/admin/crm/whatsapp', color: 'bg-green-500', desc: 'WhatsApp chat' },
  { icon: Megaphone, label: 'Broadcast', href: '/admin/crm/broadcast', color: 'bg-purple-500', desc: 'Send bulk messages' },
  { icon: Bot, label: 'Chatbot', href: '/admin/crm/chatbots', color: 'bg-violet-500', desc: 'AI automation' },
  { icon: Mail, label: 'Email', href: '/admin/crm/email', color: 'bg-orange-500', desc: 'Email campaigns' },
  { icon: Layout, label: 'Landing Page', href: '/admin/landing-pages', color: 'bg-pink-500', desc: 'Build pages' },
];

const SETUP_CHECKLIST = [
  { key: 'whatsapp', label: 'Connect WhatsApp', href: '/admin/crm/connections', desc: 'Link your Meta WhatsApp Business API' },
  { key: 'email', label: 'Configure Email', href: '/admin/crm/connections', desc: 'Set up SMTP or email service' },
  { key: 'leads', label: 'Import Leads', href: '/admin/crm/funnel', desc: 'Add your first contacts' },
  { key: 'template', label: 'Create Template', href: '/admin/crm/templates', desc: 'Design message templates' },
  { key: 'chatbot', label: 'Set Up Chatbot', href: '/admin/crm/chatbots', desc: 'Automate responses' },
  { key: 'landing', label: 'Build Landing Page', href: '/admin/landing-pages', desc: 'Create lead capture page' },
];

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState('Good morning');
  const [userName, setUserName] = useState('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const name = localStorage.getItem('crm_user_name') || localStorage.getItem('admin_name') || '';
    setUserName(name);

    // Load completed setup steps
    try {
      const saved = localStorage.getItem('crm_setup_completed');
      if (saved) setCompletedSteps(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const toggleStep = (key: string) => {
    const updated = completedSteps.includes(key)
      ? completedSteps.filter(k => k !== key)
      : [...completedSteps, key];
    setCompletedSteps(updated);
    localStorage.setItem('crm_setup_completed', JSON.stringify(updated));
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const tenantSlug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/analytics?tenant=${tenantSlug}&period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Failed to load analytics');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error || 'Failed to load analytics'}</p>
        <button onClick={fetchAnalytics} className="mt-4 text-indigo-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const { summary, charts, topAgents } = data;
  const maxDailyCount = Math.max(...charts.dailyLeads.map(d => d.count), 1);
  const setupProgress = Math.round((completedSteps.length / SETUP_CHECKLIST.length) * 100);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* WELCOME BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 sm:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-sm text-indigo-200">{greeting}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {userName ? `Welcome back, ${userName}!` : 'Welcome to your CRM!'}
            </h1>
            <p className="text-indigo-100 mt-2 text-sm sm:text-base">
              {data.tenant?.name || 'Your Business'} &bull; {data.tenant?.plan || 'Free'} Plan &bull;{' '}
              <CalendarDays className="w-4 h-4 inline" /> {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-white/30 backdrop-blur"
            >
              <option value="7d" className="text-gray-900">Last 7 days</option>
              <option value="30d" className="text-gray-900">Last 30 days</option>
              <option value="90d" className="text-gray-900">Last 90 days</option>
            </select>
            <button
              onClick={fetchAnalytics}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            icon: Users, label: 'Total Leads', value: summary.totalLeads,
            sub: `+${summary.newLeads} new`, growth: summary.growthRate,
            bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
          },
          {
            icon: MessageSquare, label: 'Messages', value: summary.totalMessages,
            sub: `+${summary.recentMessages} recent`, growth: null,
            bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600',
          },
          {
            icon: Radio, label: 'Broadcasts', value: summary.totalBroadcasts,
            sub: `+${summary.recentBroadcasts} recent`, growth: null,
            bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
          },
          {
            icon: Target, label: 'Conversion', value: `${summary.conversionRate}%`,
            sub: summary.avgResponseTimeMinutes ? `Avg ${summary.avgResponseTimeMinutes}min` : 'Response time',
            growth: null,
            bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
          },
        ].map((card, i) => (
          <div key={i} className={`${card.bg} rounded-2xl p-4 sm:p-5 border border-white/60 shadow-sm hover:shadow-md transition`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${card.iconBg} rounded-xl`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              {card.growth !== null && (
                <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
                  card.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {card.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(card.growth)}%
                </div>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="group flex flex-col items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className={`${action.color} p-3 rounded-xl text-white mb-2 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-900 text-center">{action.label}</span>
              <span className="text-xs text-gray-400 text-center hidden sm:block">{action.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* CHARTS + SETUP ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Lead Growth
          </h3>
          <div className="h-48 flex items-end gap-1">
            {charts.dailyLeads.length === 0 ? (
              <p className="text-gray-400 text-sm w-full text-center py-16">No data yet — add your first leads!</p>
            ) : (
              charts.dailyLeads.map((day, idx) => (
                <div key={idx} className="flex-1 group relative">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t hover:from-indigo-600 hover:to-indigo-500 transition-all cursor-pointer"
                    style={{ height: `${(day.count / maxDailyCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                    {day.date}: {day.count}
                  </div>
                </div>
              ))
            )}
          </div>
          {charts.dailyLeads.length > 0 && (
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{charts.dailyLeads[0]?.date || '-'}</span>
              <span>{charts.dailyLeads[charts.dailyLeads.length - 1]?.date || '-'}</span>
            </div>
          )}
        </div>

        {/* Setup Checklist */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Setup Checklist
            </h3>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              {setupProgress}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${setupProgress}%` }}
            />
          </div>
          <div className="space-y-2">
            {SETUP_CHECKLIST.map(step => {
              const done = completedSteps.includes(step.key);
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
                    done ? 'bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleStep(step.key)}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${done ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{step.desc}</p>
                  </div>
                  {!done && (
                    <Link
                      href={step.href}
                      onClick={e => e.stopPropagation()}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STATUS DISTRIBUTION + SOURCES + AGENTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leads by Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Lead Status
          </h3>
          <div className="space-y-3">
            {charts.leadsByStatus.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            ) : (
              charts.leadsByStatus.map((item, idx) => {
                const total = charts.leadsByStatus.reduce((a, b) => a + b.count, 0);
                const percent = total > 0 ? ((item.count / total) * 100).toFixed(0) : '0';
                const color = STATUS_COLORS[item.status] || '#9ca3af';
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="capitalize text-gray-700">{item.status}</span>
                      </div>
                      <span className="text-gray-500 font-medium">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Lead Sources */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Top Sources
          </h3>
          <div className="space-y-3">
            {charts.leadsBySource.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            ) : (
              charts.leadsBySource.slice(0, 5).map((source, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-600' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{source.source}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{source.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Agents */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {topAgents.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No agent data yet</p>
            ) : (
              topAgents.slice(0, 5).map((agent, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-600' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{agent.agentId}</p>
                    <p className="text-xs text-gray-400">{agent.leads} leads</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* USAGE METER */}
      {data.tenant && (
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Lead Usage
                </h3>
                <p className="text-indigo-100 text-sm">{data.tenant.plan} Plan</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{data.tenant.leadsUsed.toLocaleString()}</p>
                <p className="text-indigo-100 text-sm">of {data.tenant.leadsLimit.toLocaleString()} leads</p>
              </div>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.min(100, (data.tenant.leadsUsed / data.tenant.leadsLimit) * 100)}%` }}
              />
            </div>
            {data.tenant.leadsUsed >= data.tenant.leadsLimit * 0.8 && (
              <p className="mt-3 text-amber-200 text-sm">
                You&apos;re approaching your lead limit. Consider upgrading your plan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* EXPLORE CRM */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Explore Your CRM
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Plug, label: 'Connections', href: '/admin/crm/connections', desc: 'Connect services', gradient: 'from-amber-500 to-orange-500' },
            { icon: Zap, label: 'Integrations', href: '/admin/crm/integration-hub', desc: 'Configure workflows', gradient: 'from-violet-500 to-purple-500' },
            { icon: GraduationCap, label: 'E-Learning', href: '/admin/crm/e-learning', desc: 'Courses & content', gradient: 'from-emerald-500 to-teal-500' },
            { icon: Settings, label: 'Settings', href: '/admin/crm/settings', desc: 'CRM configuration', gradient: 'from-gray-500 to-gray-700' },
          ].map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="group relative overflow-hidden rounded-2xl p-5 text-white hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
              <div className="relative z-10">
                <item.icon className="w-6 h-6 mb-2" />
                <p className="font-semibold">{item.label}</p>
                <p className="text-xs text-white/70">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
