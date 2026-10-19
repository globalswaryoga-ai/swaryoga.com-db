'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  GraduationCap,
  CalendarDays,
  BookOpen,
  Sparkles,
  Globe,
  Languages,
  Video,
  FileText,
  Tag,
  Settings,
  ArrowRight,
  Search,
  Users,
  CheckCircle2,
  ExternalLink,
  Layers,
} from 'lucide-react';

type WorkshopTabKey = 'all' | 'cohorts' | 'registration' | 'landing';

interface PageCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
  category: 'cohorts' | 'registration' | 'landing';
}

const workshopPages: PageCard[] = [
  // ── 1. Cohorts & Master Batches ──
  {
    label: 'Workshop Students & Cohorts',
    description: 'Manage student enrollments, batch cohorts, daily class duration, attendance logs, and YouTube & Bunny recordings.',
    href: '/admin/crm/workshop-management',
    icon: GraduationCap,
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'Core Manager',
    category: 'cohorts',
  },
  {
    label: 'Batch Schedules & Timelines',
    description: 'Calendar schedules, morning and evening batch timings, intake start/end dates, and class calendars.',
    href: '/admin/workshops/schedules',
    icon: CalendarDays,
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'Batch Calendar',
    category: 'cohorts',
  },
  {
    label: 'Master Workshop Catalog',
    description: 'Complete directory of Swar Yoga workshops, course curriculums, syllabi, and level configurations.',
    href: '/admin/workshops',
    icon: BookOpen,
    gradient: 'from-violet-500 to-purple-600',
    badge: 'Course Catalog',
    category: 'cohorts',
  },
  {
    label: 'Youth & Kids Program',
    description: 'Curated workshops, student registrations, and batch activities tailored specifically for children and youth.',
    href: '/admin/youth-program',
    icon: Sparkles,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Youth & Kids',
    category: 'cohorts',
  },

  // ── 2. Multi-Language Batch Registrations ──
  {
    label: 'English Batch Registration',
    description: 'English medium workshop registrations, automated form intake, WhatsApp alerts, and student workflows.',
    href: '/admin/crm/new-registration/english',
    icon: Globe,
    gradient: 'from-sky-500 to-blue-600',
    badge: 'English Batch',
    category: 'registration',
  },
  {
    label: 'Hindi Batch Registration',
    description: 'Hindi medium cohort registration portal, student data capture, question validation, and batch notifications.',
    href: '/admin/crm/new-registration/hindi',
    icon: Languages,
    gradient: 'from-orange-500 to-amber-600',
    badge: 'Hindi Batch',
    category: 'registration',
  },
  {
    label: 'Marathi Batch Registration',
    description: 'Marathi medium workshop admissions, batch tracking, participant roster, and intake sync.',
    href: '/admin/crm/new-registration/marathi',
    icon: Languages,
    gradient: 'from-rose-500 to-pink-600',
    badge: 'Marathi Batch',
    category: 'registration',
  },
  {
    label: 'Kannada Batch Registration',
    description: 'Kannada medium student registrations, cohort assigning, contact validation, and automated confirmations.',
    href: '/admin/crm/new-registration/kannada',
    icon: Languages,
    gradient: 'from-emerald-500 to-green-600',
    badge: 'Kannada Batch',
    category: 'registration',
  },
  {
    label: 'Zoom Meet Direct Registration',
    description: 'Direct Zoom meeting registrations, instant link delivery, calendar invites, and passcode automations.',
    href: '/admin/crm/new-registration/zoom-meet',
    icon: Video,
    gradient: 'from-blue-600 to-cyan-600',
    badge: 'Zoom Meet',
    category: 'registration',
  },

  // ── 3. Landing Pages & Offers ──
  {
    label: 'Workshop Landing Pages',
    description: 'High-converting workshop landing pages, funnel templates, registration triggers, and promotional copy.',
    href: '/admin/landing-pages',
    icon: FileText,
    gradient: 'from-purple-500 to-indigo-600',
    badge: 'Funnels & Pages',
    category: 'landing',
  },
  {
    label: 'Workshop Offers & Studio',
    description: 'Early bird discounts, promotional pricing packages, Canva graphic creatives studio, and payment tracking.',
    href: '/admin/crm/workshop-offer',
    icon: Tag,
    gradient: 'from-fuchsia-500 to-rose-600',
    badge: 'Offers & Discounts',
    category: 'landing',
  },
  {
    label: 'Zoom & Recording Settings',
    description: 'Cohort Zoom meeting IDs, YouTube playlist connections, and cloud recording sync configurations.',
    href: '/admin/crm/workshop-management/zoom-setting',
    icon: Settings,
    gradient: 'from-slate-600 to-gray-800',
    badge: 'Zoom Integration',
    category: 'landing',
  },
];

const tabFilters: { key: WorkshopTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Modules', count: (l) => l.length },
  { key: 'cohorts', label: 'Cohorts & Batches', count: (l) => l.filter(p => p.category === 'cohorts').length },
  { key: 'registration', label: 'Batch Registrations', count: (l) => l.filter(p => p.category === 'registration').length },
  { key: 'landing', label: 'Landing Pages & Offers', count: (l) => l.filter(p => p.category === 'landing').length },
];

function WorkshopHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkshopTabKey>('all');
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
    const tab = searchParams.get('tab') as WorkshopTabKey;
    if (tab && ['all', 'cohorts', 'registration', 'landing'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: WorkshopTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/workshop-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = workshopPages.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/60 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Workshop Management</h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Cohorts & Curriculums
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Central hub for Swar Yoga workshop cohorts, student attendance, batch registrations across languages, landing funnels, and pricing offers.
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
              placeholder="Search workshop modules..."
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(workshopPages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-500/80 text-white' : 'bg-gray-200 text-gray-600'
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
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
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
                <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-600" />
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open module</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-sm">No workshop modules found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Footer Stats & Quick Jump */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 shadow-xs">
        <div>
          Showing <strong>{filteredCards.length}</strong> modules in{' '}
          <strong>{tabFilters.find((t) => t.key === activeTab)?.label}</strong>
        </div>
        <div className="text-gray-400">Total: {workshopPages.length} Workshop Management Modules</div>
      </div>
    </div>
  );
}

export default function WorkshopHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <WorkshopHubContent />
    </Suspense>
  );
}
