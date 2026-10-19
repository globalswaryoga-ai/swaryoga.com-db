'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Globe,
  Users,
  MessageSquare,
  Video,
  Shield,
  Film,
  BarChart3,
  FileCheck,
  Send,
  PlusCircle,
  Search,
  ArrowRight,
  ChevronRight,
  Radio,
  Share2,
  Calendar,
  Sparkles,
  Layers,
  HeartHandshake,
  CheckCircle2,
  Settings,
  Flame,
} from 'lucide-react';

type CommunityTabKey = 'all' | 'channels' | 'members-content' | 'recordings-media' | 'moderation-settings' | 'external-groups';

interface PageCard {
  id: string;
  label: string;
  tagline: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge: string;
  badgeColor: string;
  category: 'channels' | 'members-content' | 'recordings-media' | 'moderation-settings' | 'external-groups';
  primaryActionLabel?: string;
  features: string[];
}

const communityPages: PageCard[] = [
  // ── 1. Channels & Discussion ──
  {
    id: 'community-workspace',
    label: 'Community Full Workspace',
    tagline: 'All-in-One Community Studio',
    description: 'Central hub to manage all channels (Swar Yoga L1–L5, Aahar, Garbh Sanskar, Yogasana), publish rich posts, and oversee members.',
    href: '/admin/crm/community/workspace',
    icon: Globe,
    gradient: 'from-indigo-600 via-blue-600 to-cyan-600',
    badge: 'Core Studio',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    category: 'channels',
    primaryActionLabel: 'Open Workspace',
    features: ['Multi-channel Switcher', 'Live Feed Preview', 'Rich Media Composer'],
  },
  {
    id: 'channels-feed',
    label: 'Community Channels & Feeds',
    tagline: 'Discussions & Posts Feed',
    description: 'Browse channel posts, student reactions, comments, pinned announcements, and interactive question threads.',
    href: '/admin/crm/community/workspace?tab=posts',
    icon: MessageSquare,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    badge: 'Discussions',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-200',
    category: 'channels',
    primaryActionLabel: 'View Feed & Posts',
    features: ['Pinned Announcements', 'Comment Moderation', 'Reactions & Engagement'],
  },
  {
    id: 'create-post',
    label: 'Publish Announcement / Post',
    tagline: 'Multi-Channel Broadcast',
    description: 'Compose a formatted post with image, video, CTA buttons, and cross-publish instantly to community channels or Telegram.',
    href: '/admin/crm/community/workspace?tab=posts',
    icon: Send,
    gradient: 'from-pink-500 via-rose-500 to-amber-500',
    badge: 'Composer',
    badgeColor: 'bg-pink-500/10 text-pink-600 border-pink-200',
    category: 'channels',
    primaryActionLabel: 'Create Post',
    features: ['Rich Text Formatting', 'Action CTA Buttons', 'Cross-Post to Telegram'],
  },

  // ── 2. Members & Submissions ──
  {
    id: 'members-directory',
    label: 'Members Directory & Permissions',
    tagline: 'Sadhak Access Control',
    description: 'Review active members, approve pending join requests, configure granular chat permissions (text, links, media), or block offenders.',
    href: '/admin/crm/community/workspace?tab=members',
    icon: Users,
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    badge: 'Sadhak Directory',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    category: 'members-content',
    primaryActionLabel: 'Manage Members',
    features: ['Approval Workflows', 'Chat Permissions (Media/Links)', 'Quota Tracking'],
  },
  {
    id: 'member-submissions',
    label: 'Member Homework & Submissions',
    tagline: 'Practice Stories & Tasks',
    description: 'Review homework submitted by workshop participants, spiritual experiences, transformation testimonials, and student questions.',
    href: '/admin/crm/community/workspace?tab=submissions',
    icon: FileCheck,
    gradient: 'from-amber-500 via-orange-600 to-red-500',
    badge: 'Homework & Stories',
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-200',
    category: 'members-content',
    primaryActionLabel: 'Review Submissions',
    features: ['Pending Approvals', 'One-Click Post to Feed', 'Student Homework Review'],
  },

  // ── 3. Recordings & Media ──
  {
    id: 'session-recordings',
    label: 'Session Recordings Archive',
    tagline: 'Zoom & Cloud Playback',
    description: 'Organize workshop class recordings, set private playlist permissions per community tier, and monitor streaming access.',
    href: '/admin/crm/community/workspace?tab=recordings',
    icon: Video,
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    badge: 'Class Recordings',
    badgeColor: 'bg-violet-500/10 text-violet-700 border-violet-200',
    category: 'recordings-media',
    primaryActionLabel: 'Browse Recordings',
    features: ['Private YouTube & Bunny.net', 'Per-Student Playlists', 'Access Expiry Rules'],
  },
  {
    id: 'video-library',
    label: 'Guided Video Library',
    tagline: 'Video Lessons & Practices',
    description: 'Curate daily sadhana guided videos, yogasana demonstrations, and nutritional masterclasses with custom tags.',
    href: '/admin/crm/community/workspace?tab=videos',
    icon: Film,
    gradient: 'from-purple-500 via-pink-600 to-rose-600',
    badge: 'Video Catalog',
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-200',
    category: 'recordings-media',
    primaryActionLabel: 'Manage Videos',
    features: ['Category Tags', 'YouTube & Direct Video', 'Quick Embeds'],
  },
  {
    id: 'video-analytics',
    label: 'Video Watch & Bandwidth Analytics',
    tagline: 'Engagement & Retention',
    description: 'Analyze student video watch duration, completion rates, most popular workshop sessions, and monthly bandwidth consumption.',
    href: '/admin/crm/community/workspace?tab=analytics',
    icon: BarChart3,
    gradient: 'from-cyan-600 via-teal-600 to-emerald-600',
    badge: 'Watch Metrics',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
    category: 'recordings-media',
    primaryActionLabel: 'View Analytics',
    features: ['Watch Duration Heatmaps', 'Per-User Quota Usage', 'Drop-off Tracking'],
  },

  // ── 4. Moderation & Integration Settings ──
  {
    id: 'community-moderation',
    label: 'Content Moderation Queue',
    tagline: 'Quality & Spam Shield',
    description: 'Review and approve pending experiences, Q&A questions, health tips, and transformation stories before they go live.',
    href: '/admin/crm/community-moderation',
    icon: Shield,
    gradient: 'from-rose-600 via-red-600 to-orange-600',
    badge: 'Moderation Queue',
    badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-200',
    category: 'moderation-settings',
    primaryActionLabel: 'Open Moderation',
    features: ['Approve / Reject Queue', 'Categorized Moderation', 'Instant Content Publishing'],
  },
  {
    id: 'zoom-mapping',
    label: 'Zoom Meeting Recording Mapping',
    tagline: 'Auto-Upload to Channels',
    description: 'Map recurring Zoom meeting IDs directly to community channels for automatic cloud recording ingest and YouTube playlist sync.',
    href: '/admin/crm/community/zoom-setting',
    icon: Settings,
    gradient: 'from-slate-700 via-gray-800 to-zinc-900',
    badge: 'Automation Sync',
    badgeColor: 'bg-slate-500/10 text-slate-700 border-slate-200',
    category: 'moderation-settings',
    primaryActionLabel: 'Setup Mapping',
    features: ['Meeting ID → Channel Sync', 'Playlist Auto-Assignment', 'Batch Thumbnail Mapping'],
  },

  // ── 5. External Groups & Ecosystem ──
  {
    id: 'whatsapp-groups',
    label: 'WhatsApp Group Communities',
    tagline: 'WhatsApp Group Hub',
    description: 'Manage official Swar Yoga WhatsApp groups, monitor participant counts, send group alerts, and sync community links.',
    href: '/admin/crm/whatsapp-groups',
    icon: MessageSquare,
    gradient: 'from-emerald-600 via-green-600 to-teal-700',
    badge: 'WhatsApp Groups',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    category: 'external-groups',
    primaryActionLabel: 'Manage WA Groups',
    features: ['Group Participant Sync', 'Automated Group Welcome', 'Broadcast Messages'],
  },
  {
    id: 'qr-group-contacts',
    label: 'QR Group Contacts Extraction',
    tagline: 'Extract & Message Groups',
    description: 'Extract member phone numbers from linked QR WhatsApp groups to create targeted broadcast lists and follow-ups.',
    href: '/admin/crm/qr/group-contacts',
    icon: Layers,
    gradient: 'from-teal-500 via-cyan-600 to-blue-600',
    badge: 'QR Contacts',
    badgeColor: 'bg-teal-500/10 text-teal-700 border-teal-200',
    category: 'external-groups',
    primaryActionLabel: 'Extract Contacts',
    features: ['One-Click Contact Export', 'Broadcast List Builder', 'Group Deduplication'],
  },
  {
    id: 'telegram-community',
    label: 'Telegram Channel Broadcasts',
    tagline: 'Official Telegram Hub',
    description: 'Publish announcements, audio recordings, and daily inspiration to Swar Yoga Telegram channels and discussion groups.',
    href: '/admin/crm/telegram',
    icon: Radio,
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    badge: 'Telegram',
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-200',
    category: 'external-groups',
    primaryActionLabel: 'Open Telegram Hub',
    features: ['Channel Broadcasts', 'Discussion Bot Sync', 'Telegram Subscriber Metrics'],
  },
  {
    id: 'sadhana-community',
    label: 'Sadhana Spiritual Practice Feed',
    tagline: 'Daily Sadhak Discipline',
    description: 'Dedicated spiritual practice feed where sadhaks log daily breath awareness, morning sadhana, and meditation notes.',
    href: '/sadhana/community',
    icon: Flame,
    gradient: 'from-orange-500 via-amber-600 to-yellow-600',
    badge: 'Daily Sadhana',
    badgeColor: 'bg-orange-500/10 text-orange-700 border-orange-200',
    category: 'external-groups',
    primaryActionLabel: 'View Sadhana Feed',
    features: ['Daily Sadhak Logs', 'Breath Awareness Tracker', 'Community Motivation'],
  },
  {
    id: 'public-community-portal',
    label: 'Public Community Join Portal',
    tagline: 'Student Entry Gateway',
    description: 'View the public discovery and join page where new students explore communities, view testimonials, and register.',
    href: '/community',
    icon: HeartHandshake,
    gradient: 'from-fuchsia-600 via-purple-600 to-indigo-600',
    badge: 'Public Portal',
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-200',
    category: 'external-groups',
    primaryActionLabel: 'View Public Portal',
    features: ['Public Join Form', 'Community Discovery', 'Instant Sadhak Onboarding'],
  },
];

const tabFilters: { key: CommunityTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Modules & Tools', count: (l) => l.length },
  { key: 'channels', label: 'Channels & Discussions', count: (l) => l.filter(p => p.category === 'channels').length },
  { key: 'members-content', label: 'Members & Submissions', count: (l) => l.filter(p => p.category === 'members-content').length },
  { key: 'recordings-media', label: 'Recordings & Videos', count: (l) => l.filter(p => p.category === 'recordings-media').length },
  { key: 'moderation-settings', label: 'Moderation & Settings', count: (l) => l.filter(p => p.category === 'moderation-settings').length },
  { key: 'external-groups', label: 'External Groups (WA / TG)', count: (l) => l.filter(p => p.category === 'external-groups').length },
];

function CommunityHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<CommunityTabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token =
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('crm_token');
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
    const tab = searchParams.get('tab') as CommunityTabKey;
    if (tab && ['all', 'channels', 'members-content', 'recordings-media', 'moderation-settings', 'external-groups'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: CommunityTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/community${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = useMemo(() => {
    return communityPages.filter((card) => {
      const matchesTab = activeTab === 'all' || card.category === activeTab;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesTab;
      const matchesSearch =
        card.label.toLowerCase().includes(q) ||
        card.tagline.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q) ||
        card.badge.toLowerCase().includes(q) ||
        card.features.some(f => f.toLowerCase().includes(q));
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Hero Banner ── */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-indigo-950/30 relative overflow-hidden border border-indigo-800/40">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 flex-shrink-0">
              <Globe className="w-8 h-8 text-cyan-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Community & Sadhana Hub
                </h1>
                <span className="bg-cyan-500/20 text-cyan-300 text-xs font-bold px-3 py-1 rounded-full border border-cyan-400/30 uppercase tracking-wider">
                  Forums, Feeds & Media
                </span>
              </div>
              <p className="text-sm text-indigo-200/80 mt-1.5 max-w-2xl leading-relaxed">
                Coordinate Swar Yoga community channels, oversee sadhak member approvals, organize session recordings, review practice homework, and moderate discussions.
              </p>
            </div>
          </div>

          {/* Quick Actions & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/admin/crm/community/workspace"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <Globe className="w-4 h-4" />
              <span>Open Workspace</span>
            </Link>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-indigo-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search community tools..."
                className="w-full bg-white/10 backdrop-blur-md border border-white/15 pl-10 pr-4 py-2.5 text-sm rounded-xl text-white placeholder-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-cyan-300 font-medium block">Community Channels</span>
            <span className="text-base sm:text-lg font-extrabold text-white">Global + L1–L5</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-emerald-300 font-medium block">Sadhak Directory</span>
            <span className="text-base sm:text-lg font-extrabold text-white">Active Members & Roles</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-purple-300 font-medium block">Class Media</span>
            <span className="text-base sm:text-lg font-extrabold text-white">Zoom & Cloud Archives</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-amber-300 font-medium block">Content Shield</span>
            <span className="text-base sm:text-lg font-extrabold text-white">Moderation Queue</span>
          </div>
        </div>
      </div>

      {/* ── Category Filter Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(communityPages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-indigo-500/80 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3-Column Card Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="group bg-white rounded-2xl border border-gray-200/90 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Subtle top accent gradient */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />

              <div>
                {/* Header row with Icon & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-md shadow-gray-200 group-hover:scale-110 transition-transform duration-200`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${card.badgeColor}`}
                  >
                    {card.badge}
                  </span>
                </div>

                {/* Title & Tagline */}
                <div className="mb-2">
                  <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">
                    {card.tagline}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                    {card.label}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                  {card.description}
                </p>

                {/* Bullet Highlights */}
                <div className="space-y-1.5 mb-4 pt-3 border-t border-gray-100">
                  {card.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-gray-100 mt-2">
                <Link
                  href={card.href}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-semibold text-xs sm:text-sm transition-all duration-200 group/btn"
                >
                  <span>{card.primaryActionLabel || 'Open Section'}</span>
                  <ChevronRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Empty State ── */}
      {filteredCards.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No community modules found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            We couldn't find any tool matching "{searchQuery}". Try searching for keywords like "feed", "recordings", "members", or "moderation".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveTab('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* ── Footer Summary Strip ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-500 shadow-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>
            Displaying <strong>{filteredCards.length}</strong> active community sections in{' '}
            <strong className="text-gray-700">{tabFilters.find((t) => t.key === activeTab)?.label}</strong>
          </span>
        </div>
        <div className="text-gray-400 text-xs">
          Total: {communityPages.length} Community Hub Modules Configured
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <CommunityHubContent />
    </Suspense>
  );
}
