'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Users,
  Filter,
  Sliders,
  Tag,
  Link2,
  Settings,
  Trash2,
  ArrowRight,
  Search,
  Sparkles,
  PhoneCall,
  UserCheck,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  QrCode,
  Share2,
  Layers,
  Inbox,
  Flame,
} from 'lucide-react';

type LeadTabKey = 'all' | 'pipeline' | 'inflow' | 'tools';

interface PageCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
  category: 'pipeline' | 'inflow' | 'tools';
}

const leadsPages: PageCard[] = [
  // ── 1. Unified Pipeline & Management ──
  {
    label: 'All Leads (Central Database)',
    description: 'Unified database of all approved leads across Web, Meta Ads, QR WhatsApp & Forms',
    href: '/admin/crm/leads',
    icon: Users,
    gradient: 'from-blue-600 to-indigo-600',
    badge: 'Core Database',
    category: 'pipeline',
  },
  {
    label: 'Unified Sales Funnel',
    description: 'Visual Kanban pipeline tracking all leads from initial contact to conversion',
    href: '/admin/crm/funnel',
    icon: Filter,
    gradient: 'from-indigo-500 to-violet-600',
    badge: 'Universal Pipeline',
    category: 'pipeline',
  },
  {
    label: 'Funnel Stage Settings',
    description: 'Customize universal funnel stages, color triggers, and milestone automations',
    href: '/admin/crm/funnel/manage',
    icon: Sliders,
    gradient: 'from-purple-500 to-pink-600',
    badge: 'Configuration',
    category: 'pipeline',
  },
  {
    label: 'Lead Follow-up Queue',
    description: 'Daily follow-up queue, scheduled call reminders, and pending inquiries',
    href: '/admin/crm/leads-followup',
    icon: PhoneCall,
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'Follow-ups',
    category: 'pipeline',
  },

  // ── 2. Inflow Channels & Review ──
  {
    label: 'Meta Ads Inflow & Review',
    description: 'Incoming Facebook & Instagram ad leads, verification and approval pipeline',
    href: '/admin/crm/leads?source=meta',
    icon: Share2,
    gradient: 'from-sky-500 to-blue-600',
    badge: 'Meta Ads',
    category: 'inflow',
  },
  {
    label: 'QR WhatsApp Leads',
    description: 'Direct inbound leads originating from WhatsApp scan & chat entry points',
    href: '/admin/crm/qr/leads',
    icon: QrCode,
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'WhatsApp QR',
    category: 'inflow',
  },
  {
    label: 'Website Enquiry Leads',
    description: 'Service inquiries, contact forms, and direct workshop registration forms',
    href: '/admin/enquiries',
    icon: Inbox,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Website',
    category: 'inflow',
  },

  // ── 3. Lead Tools, Forms & Rules ──
  {
    label: 'Lead Capture Form Links',
    description: 'Generate shareable intake links and hosted landing forms for social media',
    href: '/admin/crm/form-links',
    icon: Link2,
    gradient: 'from-violet-500 to-purple-600',
    badge: 'Capture Forms',
    category: 'tools',
  },
  {
    label: 'Custom Intake Questions',
    description: 'Build dynamic questionnaire fields for qualifying leads before follow-up',
    href: '/admin/crm/form-questions',
    icon: FileQuestion,
    gradient: 'from-rose-500 to-pink-600',
    badge: 'Form Builder',
    category: 'tools',
  },
  {
    label: 'Lead Labels & Tags',
    description: 'Create color-coded tags and segment leads by interest, language or priority',
    href: '/admin/crm/labels',
    icon: Tag,
    gradient: 'from-pink-500 to-rose-600',
    badge: 'Tags',
    category: 'tools',
  },
  {
    label: 'Auto-Assignment Rules',
    description: 'Automatically route incoming leads to sales reps based on language or source',
    href: '/admin/crm/lead-assignment-settings',
    icon: Settings,
    gradient: 'from-cyan-500 to-blue-600',
    badge: 'Rules',
    category: 'tools',
  },
  {
    label: 'Deleted Leads (Recycle Bin)',
    description: 'View deleted or spam leads with single-click restore and permanent purge',
    href: '/admin/crm/leads/deleted',
    icon: Trash2,
    gradient: 'from-red-500 to-rose-700',
    badge: 'Recycle Bin',
    category: 'tools',
  },
];

const tabFilters: { key: LeadTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Modules', count: (l) => l.length },
  { key: 'pipeline', label: 'Funnel & Pipeline', count: (l) => l.filter(p => p.category === 'pipeline').length },
  { key: 'inflow', label: 'Inflow Channels', count: (l) => l.filter(p => p.category === 'inflow').length },
  { key: 'tools', label: 'Forms & Rules', count: (l) => l.filter(p => p.category === 'tools').length },
];

function LeadsHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadTabKey>('all');
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
    const tab = searchParams.get('tab') as LeadTabKey;
    if (tab && ['all', 'pipeline', 'inflow', 'tools'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: LeadTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/leads-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = leadsPages.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-200/60 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Leads & Funnel Hub</h1>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Unified System
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                One single source of truth for all leads from Web Signups, Meta Ads, QR WhatsApp, and Enquiry Forms. Moving leads seamlessly into the Sales section.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads & funnels..."
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(leadsPages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-500/80 text-white' : 'bg-gray-200 text-gray-600'
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
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-md shadow-gray-200 group-hover:scale-105 transition-transform duration-200`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  {card.badge && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-200/60 px-2 py-0.5 rounded-md">
                      {card.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open module</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-sm">No modules found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 shadow-xs">
        <div>
          Showing <strong>{filteredCards.length}</strong> modules in{' '}
          <strong>{tabFilters.find((t) => t.key === activeTab)?.label}</strong>
        </div>
        <div className="text-gray-400">Total: {leadsPages.length} Unified Leads & Funnel Modules</div>
      </div>
    </div>
  );
}

export default function LeadsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <LeadsHubContent />
    </Suspense>
  );
}
