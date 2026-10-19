'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Share2,
  Video,
  Image,
  MessageSquare,
  Globe,
  Shield,
  Settings,
  ArrowRight,
  Search,
  Sparkles,
  Camera,
  Play,
  Film,
  Instagram,
  Radio,
  FileText,
} from 'lucide-react';

type SocialTabKey = 'all' | 'accounts' | 'media' | 'community';

interface PageCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
  category: 'accounts' | 'media' | 'community';
}

const socialPages: PageCard[] = [
  // Accounts & Channels
  {
    label: 'Social Media Accounts',
    description: 'Multi-platform social publishing for Facebook, Instagram & YouTube',
    href: '/admin/social-media',
    icon: Share2,
    gradient: 'from-pink-500 to-rose-600',
    badge: 'Publishing',
    category: 'accounts',
  },
  {
    label: 'Social Media Setup',
    description: 'Configure API keys, Meta accounts, and channel integrations',
    href: '/admin/social-media-setup',
    icon: Settings,
    gradient: 'from-fuchsia-500 to-pink-600',
    badge: 'API Config',
    category: 'accounts',
  },
  {
    label: 'Instagram Direct',
    description: 'Manage Instagram direct messages, story replies and customer chats',
    href: '/admin/crm/instagram',
    icon: Instagram,
    gradient: 'from-purple-500 to-pink-500',
    badge: 'Inbox',
    category: 'accounts',
  },
  {
    label: 'Facebook Messenger',
    description: 'Handle customer inquiries and incoming chats from Facebook',
    href: '/admin/crm/messenger',
    icon: MessageSquare,
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'Inbox',
    category: 'accounts',
  },

  // Media & Video Library
  {
    label: 'Video Library',
    description: 'Public video catalog, tutorial playlists, and media player settings',
    href: '/admin/videos',
    icon: Video,
    gradient: 'from-red-500 to-rose-600',
    badge: 'Videos',
    category: 'media',
  },
  {
    label: 'Media Assets & Upload',
    description: 'Cloud media library for images, banners, and workshop assets',
    href: '/admin/crm/media',
    icon: Image,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Assets',
    category: 'media',
  },
  {
    label: 'Inbound WhatsApp Media',
    description: 'Incoming photos, audio notes, and documents received via WhatsApp',
    href: '/admin/crm/inbound-media',
    icon: Camera,
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'WhatsApp',
    category: 'media',
  },
  {
    label: 'Private Video Vault',
    description: 'Member-only private video sessions and exclusive masterclasses',
    href: '/admin/communities/recordings-videos',
    icon: Film,
    gradient: 'from-violet-500 to-purple-600',
    badge: 'Exclusive',
    category: 'media',
  },

  // Community & Live Sessions
  {
    label: 'Community Discussions',
    description: 'Manage community channels, member engagement, and group forums',
    href: '/admin/crm/community',
    icon: Globe,
    gradient: 'from-teal-500 to-cyan-600',
    badge: 'Community',
    category: 'community',
  },
  {
    label: 'Content Moderation',
    description: 'Review flagged posts, spam filtering, and community guidelines',
    href: '/admin/crm/community-moderation',
    icon: Shield,
    gradient: 'from-sky-500 to-blue-600',
    badge: 'Moderation',
    category: 'community',
  },
  {
    label: 'Zoom Meeting Setup',
    description: 'Map Zoom meeting IDs to communities for automatic session recording',
    href: '/admin/crm/community/zoom-setting',
    icon: Play,
    gradient: 'from-indigo-500 to-purple-600',
    badge: 'Auto-Record',
    category: 'community',
  },
  {
    label: 'Zoom Analytics',
    description: 'Live attendance stats, participation duration, and session logs',
    href: '/admin/crm/zoom-analytics',
    icon: Radio,
    gradient: 'from-rose-500 to-red-600',
    badge: 'Attendance',
    category: 'community',
  },
];

const tabFilters: { key: SocialTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Modules', count: (l) => l.length },
  { key: 'accounts', label: 'Accounts & DMs', count: (l) => l.filter(p => p.category === 'accounts').length },
  { key: 'media', label: 'Media & Videos', count: (l) => l.filter(p => p.category === 'media').length },
  { key: 'community', label: 'Community & Zoom', count: (l) => l.filter(p => p.category === 'community').length },
];

function SocialMediaHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<SocialTabKey>('all');
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
    const tab = searchParams.get('tab') as SocialTabKey;
    if (tab && ['all', 'accounts', 'media', 'community'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: SocialTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/social-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = socialPages.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 border border-pink-200/60 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20 flex-shrink-0">
              <Share2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Social Media Hub</h1>
                <span className="bg-pink-100 text-pink-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-pink-200">
                  {socialPages.length} Modules
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Manage all your publishing channels, Instagram DMs, video catalog, WhatsApp media, and community recordings in one centralized dashboard.
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
              placeholder="Search social tools..."
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(socialPages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-pink-500/80 text-white' : 'bg-gray-200 text-gray-600'
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
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-pink-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
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
                <h3 className="text-base font-bold text-gray-900 group-hover:text-pink-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-pink-600" />
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-pink-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="text-gray-400">Total: {socialPages.length} Social & Media Modules</div>
      </div>
    </div>
  );
}

export default function SocialMediaHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
        </div>
      }
    >
      <SocialMediaHubContent />
    </Suspense>
  );
}
