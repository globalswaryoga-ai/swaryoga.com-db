'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  DollarSign,
  Users,
  MessageSquare,
  QrCode,
  Radio,
  PhoneCall,
  Video,
  Shield,
  ArrowRight,
  Search,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';

type ReportTabKey = 'all' | 'executive' | 'messaging' | 'sales-zoom';

interface ReportCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  category: 'executive' | 'messaging' | 'sales-zoom';
  badge: string;
  type: string;
}

const reportCards: ReportCard[] = [
  // ── 1. Executive & Core CRM ──
  {
    label: 'Unified Reports Center',
    description: 'Central data clearinghouse for custom date-range metrics, aggregate KPIs, and one-click PDF & CSV exports.',
    href: '/admin/crm/all-reports',
    icon: FileText,
    gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    category: 'executive',
    badge: 'Central Export',
    type: 'CSV / PDF',
  },
  {
    label: 'Visual CRM Analytics',
    description: 'Interactive graphical dashboards tracking multi-tier growth curves, user acquisition, and overall pipeline velocity.',
    href: '/admin/crm/analytics',
    icon: BarChart3,
    gradient: 'from-indigo-600 via-purple-600 to-pink-500',
    category: 'executive',
    badge: 'Live Charts',
    type: 'Visual KPI',
  },
  {
    label: 'Super Admin Master Reports',
    description: 'Platform-wide benchmarks, cross-tenant statistics, multi-organization revenue, and systemic usage audits.',
    href: '/admin/crm/super-admin/reports',
    icon: Shield,
    gradient: 'from-purple-700 via-violet-600 to-indigo-800',
    category: 'executive',
    badge: 'Master Audit',
    type: 'Super Admin',
  },

  // ── 2. WhatsApp & Messaging ──
  {
    label: 'Meta WhatsApp Delivery Reports',
    description: 'Official Meta Cloud API delivery receipts, read rates, click-through rates, and message error diagnostic codes.',
    href: '/admin/crm/reports/meta',
    icon: MessageSquare,
    gradient: 'from-emerald-500 via-teal-600 to-green-600',
    category: 'messaging',
    badge: 'Cloud API',
    type: 'Delivery Logs',
  },
  {
    label: 'QR WhatsApp Activity Reports',
    description: 'Multi-device QR WhatsApp sent volume, contact list delivery status, group blast history, and retry logs.',
    href: '/admin/crm/qr/broadcast-report',
    icon: QrCode,
    gradient: 'from-teal-500 via-emerald-600 to-cyan-600',
    category: 'messaging',
    badge: 'QR Reports',
    type: 'Chat Logs',
  },
  {
    label: 'WhatsApp Conversation Analytics',
    description: 'First-response time benchmarks, agent resolution speed, peak chatting hours, and workload distribution.',
    href: '/admin/crm/whatsapp-analytics',
    icon: PieChart,
    gradient: 'from-cyan-500 via-blue-600 to-teal-500',
    category: 'messaging',
    badge: 'Agent SLA',
    type: 'Response Time',
  },
  {
    label: 'Broadcast Operations Dashboard',
    description: 'Live campaign queue monitoring, real-time success percentages, quota consumption, and failed recipient lists.',
    href: '/admin/crm/broadcast-dashboard',
    icon: Radio,
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    category: 'messaging',
    badge: 'Real-Time',
    type: 'Campaigns',
  },

  // ── 3. Sales, Calls & Zoom ──
  {
    label: 'Sales Revenue & Deal Reports',
    description: 'Workshop earnings, paid registrations, transaction volumes, pending dues, and average revenue per student.',
    href: '/admin/crm/sales',
    icon: DollarSign,
    gradient: 'from-amber-500 via-orange-600 to-red-500',
    category: 'sales-zoom',
    badge: 'Finance',
    type: 'Revenue',
  },
  {
    label: 'Lead Funnel & Intake Conversion',
    description: 'Drop-off stages from initial ad click / form submission to confirmed workshop enrollment across all channels.',
    href: '/admin/crm/funnel',
    icon: TrendingUp,
    gradient: 'from-orange-500 via-amber-600 to-yellow-500',
    category: 'sales-zoom',
    badge: 'Conversion',
    type: 'Funnel SLA',
  },
  {
    label: 'AI Voice Calls & Broadcast Logs',
    description: 'Autonomous AI phone call connection logs, average duration, student sentiment analysis, and transcript archives.',
    href: '/admin/crm/calls/reports',
    icon: PhoneCall,
    gradient: 'from-violet-600 via-indigo-600 to-blue-700',
    category: 'sales-zoom',
    badge: 'AI Telephony',
    type: 'Call Transcripts',
  },
  {
    label: 'Zoom Attendance & Recordings',
    description: 'Live yoga session participant tracking, duration in room, drop-off curves, and cloud recording access logs.',
    href: '/admin/crm/zoom-analytics',
    icon: Video,
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    category: 'sales-zoom',
    badge: 'Class Metrics',
    type: 'Live Sessions',
  },
];

const tabFilters: { key: ReportTabKey; label: string; count: (list: ReportCard[]) => number }[] = [
  { key: 'all', label: 'All Reports (11)', count: (l) => l.length },
  { key: 'executive', label: 'Executive & Core CRM', count: (l) => l.filter(p => p.category === 'executive').length },
  { key: 'messaging', label: 'WhatsApp & Messaging', count: (l) => l.filter(p => p.category === 'messaging').length },
  { key: 'sales-zoom', label: 'Sales, Calls & Zoom', count: (l) => l.filter(p => p.category === 'sales-zoom').length },
];

function ReportsHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || localStorage.getItem('crm_token');
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    try {
      jwtDecode(token);
      setIsAuthenticated(true);
    } catch {
      router.push(getLoginPath());
    }
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get('tab') as ReportTabKey;
    if (tab && ['all', 'executive', 'messaging', 'sales-zoom'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: ReportTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/reports-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = reportCards.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/15 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <BarChart3 className="w-8 h-8 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">All Reports & Analytics</h1>
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30 uppercase tracking-wider">
                  Real-Time Intelligence
                </span>
              </div>
              <p className="text-sm text-blue-100 mt-1.5 max-w-2xl leading-relaxed">
                Comprehensive reporting command center. Monitor marketing campaign ROI, student attendance, WhatsApp delivery health, and financial reconciliations.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports, exports, metrics..."
              className="w-full bg-white/15 backdrop-blur-md border border-white/25 pl-10 pr-4 py-2.5 text-sm rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition shadow-inner"
            />
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-blue-200 block">Total Reports</span>
            <span className="text-lg font-extrabold text-white">11 Modules</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-cyan-200 block">Export Formats</span>
            <span className="text-lg font-extrabold text-white">CSV, PDF, Excel</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-purple-200 block">Channels Tracked</span>
            <span className="text-lg font-extrabold text-white">6 Multi-Channel</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-pink-200 block">Data Freshness</span>
            <span className="text-lg font-extrabold text-white">Live Real-Time</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(reportCards);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3-Column Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-5 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 group-hover:rotate-1 transition-transform duration-200`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {card.type}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                      {card.badge}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-600" />
                </h3>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                <span>View Full Report</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No reports found</h3>
          <p className="text-sm text-gray-500 mt-1">Try searching with a different report name or metric.</p>
        </div>
      )}
    </div>
  );
}

export default function ReportsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <ReportsHubContent />
    </Suspense>
  );
}
