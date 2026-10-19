'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Monitor,
  Users,
  LogIn,
  MessageSquare,
  Calendar,
  Globe,
  Settings,
  Tag,
  Shield,
  ArrowRight,
  Smartphone,
  Wrench,
  Search,
  HardDrive,
  Eye,
  Sparkles,
} from 'lucide-react';

type WebTabKey = 'all' | 'users' | 'inquiries' | 'content' | 'settings';

interface PageCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
  category: 'users' | 'inquiries' | 'content' | 'settings';
  superAdminOnly?: boolean;
}

const websitePages: PageCard[] = [
  // ── Users & Registrations ──
  {
    label: 'Signup Data',
    description: 'Registration records, form submissions, and verified new accounts',
    href: '/admin/signup-data',
    icon: Users,
    gradient: 'from-blue-600 to-indigo-600',
    badge: 'Signups',
    category: 'users',
  },
  {
    label: 'Signin Data',
    description: 'Student login logs, authentication timestamps, and session history',
    href: '/admin/signin-data',
    icon: LogIn,
    gradient: 'from-indigo-500 to-purple-600',
    badge: 'Security',
    category: 'users',
  },
  {
    label: 'Website Users',
    description: 'View, search, and manage all registered website members & accounts',
    href: '/admin/users',
    icon: Users,
    gradient: 'from-purple-500 to-pink-600',
    badge: 'Directory',
    category: 'users',
    superAdminOnly: true,
  },
  {
    label: 'Admin Users',
    description: 'Manage staff, admin privileges, role-based permissions, and team access',
    href: '/admin/crm/users',
    icon: Shield,
    gradient: 'from-violet-600 to-indigo-700',
    badge: 'Permissions',
    category: 'users',
    superAdminOnly: true,
  },

  // ── Inquiries & Traffic ──
  {
    label: 'Contact Messages',
    description: 'Direct inquiries, suggestions, and feedback sent via Contact Us form',
    href: '/admin/contact-messages',
    icon: MessageSquare,
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'Inbound',
    category: 'inquiries',
  },
  {
    label: 'Enquiries',
    description: 'Course and workshop specific questions submitted across landing pages',
    href: '/admin/enquiries',
    icon: MessageSquare,
    gradient: 'from-teal-500 to-cyan-600',
    badge: 'Workshops',
    category: 'inquiries',
  },
  {
    label: 'Website Visitors & Analytics',
    description: 'Live visitor traffic, location demographics, and button click analytics',
    href: '/admin/crm/visitors',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    badge: 'Traffic',
    category: 'inquiries',
  },

  // ── Content & Schedules ──
  {
    label: 'Workshop Schedules & Dates',
    description: 'Manage live workshop schedules, upcoming batch dates, and timings',
    href: '/admin/workshops/schedules',
    icon: Calendar,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Batches',
    category: 'content',
  },
  {
    label: 'Promotional Offers',
    description: 'Manage discount coupons, seasonal promotional offers, and banner deals',
    href: '/admin/offers',
    icon: Tag,
    gradient: 'from-rose-500 to-pink-600',
    badge: 'Discounts',
    category: 'content',
  },

  // ── Settings & System ──
  {
    label: 'Website Settings',
    description: 'General website metadata, brand identity, header, and footer config',
    href: '/admin/settings',
    icon: Settings,
    gradient: 'from-slate-600 to-gray-800',
    badge: 'Site Config',
    category: 'settings',
  },
  {
    label: 'CRM Settings',
    description: 'CRM global operational parameters, notification rules, and preferences',
    href: '/admin/crm/settings',
    icon: Wrench,
    gradient: 'from-gray-700 to-slate-900',
    badge: 'CRM Config',
    category: 'settings',
  },
  {
    label: 'Connected Devices',
    description: 'Active login sessions, authorized mobile devices, and browser tracking',
    href: '/admin/crm/devices',
    icon: Smartphone,
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'Hardware',
    category: 'settings',
  },
  {
    label: 'Storage & Backup Usage',
    description: 'Monitor database size, cloud storage GB consumption, and backup logs',
    href: '/admin/crm/storage',
    icon: HardDrive,
    gradient: 'from-indigo-600 to-purple-700',
    badge: 'Storage',
    category: 'settings',
  },
];

const tabFilters: { key: WebTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Website Pages', count: (l) => l.length },
  { key: 'users', label: 'Users & Signups', count: (l) => l.filter(p => p.category === 'users').length },
  { key: 'inquiries', label: 'Inquiries & Traffic', count: (l) => l.filter(p => p.category === 'inquiries').length },
  { key: 'content', label: 'Schedules & Offers', count: (l) => l.filter(p => p.category === 'content').length },
  { key: 'settings', label: 'Settings & System', count: (l) => l.filter(p => p.category === 'settings').length },
];

function WebAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<WebTabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || localStorage.getItem('crm_token');
    if (!token) {
      router.push(getLoginPath());
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      const superAdminEmails = [
        'swarsakshi9999@gmail.com',
        'admin@swaryoga.com',
        'vijay@swaryoga.com',
        'varun@swaryoga.com',
      ];
      const userIsSuperAdmin =
        decoded.role === 'superadmin' || superAdminEmails.includes(decoded?.email?.toLowerCase());
      setIsSuperAdmin(userIsSuperAdmin);
      setIsAuthenticated(true);
    } catch {
      router.push(getLoginPath());
    }
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get('tab') as WebTabKey;
    if (tab && ['all', 'users', 'inquiries', 'content', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: WebTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/web-admin${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const visiblePages = websitePages.filter((p) => {
    if (p.superAdminOnly && !isSuperAdmin) return false;
    return true;
  });

  const filteredCards = visiblePages.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-indigo-50 border border-orange-200/60 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 flex-shrink-0">
              <Monitor className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Website Management</h1>
                <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-orange-200">
                  Web Super Admin
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Manage website members, user signups, inbound contact messages, workshop schedules, and overall system configuration.
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
              placeholder="Search website pages..."
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(visiblePages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-orange-500/80 text-white' : 'bg-gray-200 text-gray-600'
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
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-orange-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
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
                <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-orange-600" />
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open page</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-sm">No pages found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 shadow-xs">
        <div>
          Showing <strong>{filteredCards.length}</strong> pages in{' '}
          <strong>{tabFilters.find((t) => t.key === activeTab)?.label}</strong>
        </div>
        <div className="text-gray-400">Total: {visiblePages.length} Website Pages</div>
      </div>
    </div>
  );
}

export default function WebAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        </div>
      }
    >
      <WebAdminContent />
    </Suspense>
  );
}
