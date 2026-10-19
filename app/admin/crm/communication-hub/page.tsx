'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  MessageCircle,
  QrCode,
  MessageSquare,
  UsersRound,
  CalendarClock,
  Radio,
  Bot,
  Mail,
  Send,
  SmartphoneNfc,
  PhoneCall,
  PhoneForwarded,
  BarChart3,
  FileText,
  Settings,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
} from 'lucide-react';

type CommTabKey = 'all' | 'qr' | 'meta' | 'calls' | 'email-sms' | 'telegram';

interface CommCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  channel: 'QR WhatsApp' | 'Meta WhatsApp' | 'Email' | 'SMS' | 'AI Calls' | 'Telegram';
  category: 'qr' | 'meta' | 'calls' | 'email-sms' | 'telegram';
  badge?: string;
  stats?: string;
}

const communicationCards: CommCard[] = [
  // ── 1. QR WhatsApp Suite ──
  {
    label: 'QR WhatsApp',
    description: 'Multi-device WhatsApp inbox & connection bridge. Pair your phone number via QR code scan, chat in real time, and manage contacts.',
    href: '/admin/crm/qr',
    icon: QrCode,
    gradient: 'from-emerald-500 to-teal-600',
    channel: 'QR WhatsApp',
    category: 'qr',
    badge: 'Live Chats & Device',
  },
  {
    label: 'QR Broadcast & Scheduler',
    description: 'Blast bulk announcements, drip sequences, and scheduled group reminder messages directly through connected QR numbers.',
    href: '/admin/crm/qr/broadcast',
    icon: Radio,
    gradient: 'from-teal-500 to-emerald-600',
    channel: 'QR WhatsApp',
    category: 'qr',
    badge: 'Mass Blasts',
  },
  {
    label: 'QR Auto-Reply Triggers',
    description: 'Keyword-based automated answers, welcome greetings, and FAQs triggered instantaneously on inbound chats.',
    href: '/admin/crm/qr/automation',
    icon: Bot,
    gradient: 'from-cyan-600 to-teal-700',
    channel: 'QR WhatsApp',
    category: 'qr',
    badge: 'Auto Bot',
  },

  // ── 2. Meta WhatsApp Official Suite ──
  {
    label: 'Meta WhatsApp 1:1 Inbox',
    description: 'Official Meta Cloud API live chat console. Unified team inbox with tags, agent assignment, and verified badge delivery.',
    href: '/admin/crm/meta',
    icon: MessageSquare,
    gradient: 'from-green-600 to-emerald-700',
    channel: 'Meta WhatsApp',
    category: 'meta',
    badge: 'Cloud API',
  },
  {
    label: 'Meta Analytics Dashboard',
    description: 'Monitor daily conversation volumes, agent response latency, cost per message, and tier delivery quality scores.',
    href: '/admin/crm/meta-dashboard',
    icon: BarChart3,
    gradient: 'from-emerald-600 to-teal-700',
    channel: 'Meta WhatsApp',
    category: 'meta',
    badge: 'Metrics',
  },
  {
    label: 'Cloud HSM Templates',
    description: 'Manage official pre-approved Meta WhatsApp templates for marketing campaigns, utility alerts, and OTPs.',
    href: '/admin/crm/meta/templates',
    icon: FileText,
    gradient: 'from-teal-600 to-emerald-800',
    channel: 'Meta WhatsApp',
    category: 'meta',
    badge: 'HSM Templates',
  },
  {
    label: 'Connect Teachers Routing',
    description: 'Route student inquiries and workshop leads directly to individual yoga instructors WhatsApp numbers.',
    href: '/admin/crm/whatsapp/teachers',
    icon: GraduationCap,
    gradient: 'from-indigo-600 to-purple-600',
    channel: 'Meta WhatsApp',
    category: 'meta',
    badge: 'Routing',
  },
  {
    label: 'WhatsApp API & Webhooks',
    description: 'Configure Cloud API credentials, phone number IDs, verify tokens, and monitor live inbound webhook payloads.',
    href: '/admin/crm/whatsapp/settings',
    icon: Settings,
    gradient: 'from-slate-600 to-gray-800',
    channel: 'Meta WhatsApp',
    category: 'meta',
    badge: 'API Config',
  },

  // ── 3. AI Voice Calling Suite ──
  {
    label: 'AI Voice Calling Dashboard',
    description: 'Autonomous AI voice agent capable of placing real human-like conversational calls for lead qualification and live support.',
    href: '/admin/crm/calls',
    icon: PhoneCall,
    gradient: 'from-indigo-500 to-blue-600',
    channel: 'AI Calls',
    category: 'calls',
    badge: 'Voice AI',
  },
  {
    label: 'AI Voice Agents & Prompts',
    description: 'Configure custom voice personas, speaking pitch, speed, Indian/English accents, and automated conversation prompts.',
    href: '/admin/crm/calls/agents',
    icon: Sparkles,
    gradient: 'from-purple-600 to-indigo-700',
    channel: 'AI Calls',
    category: 'calls',
    badge: 'Agent Personas',
  },
  {
    label: 'Bulk Voice Broadcasts',
    description: 'Blast automated voice reminder calls to hundreds of participants simultaneously for live workshop countdowns.',
    href: '/admin/crm/calls/broadcasts',
    icon: PhoneForwarded,
    gradient: 'from-blue-600 to-indigo-700',
    channel: 'AI Calls',
    category: 'calls',
    badge: 'Voice Blasts',
  },
  {
    label: 'Voice Scripts & Templates',
    description: 'Pre-recorded audio scripts, IVR menu flows, and workshop reminder voice templates.',
    href: '/admin/crm/calls/templates',
    icon: FileText,
    gradient: 'from-cyan-600 to-blue-700',
    channel: 'AI Calls',
    category: 'calls',
    badge: 'Audio Scripts',
  },
  {
    label: 'Call Analytics & Transcripts',
    description: 'Full call recording playback, sentiment analysis, audio duration, and call completion rates.',
    href: '/admin/crm/calls/reports',
    icon: BarChart3,
    gradient: 'from-teal-600 to-emerald-700',
    channel: 'AI Calls',
    category: 'calls',
    badge: 'Analytics',
  },

  // ── 4. Email & SMS Suite ──
  {
    label: 'Unified Email Inbox',
    description: 'Send and receive student emails, triage support tickets, and manage professional corporate communications.',
    href: '/admin/crm/email',
    icon: Mail,
    gradient: 'from-rose-500 to-red-600',
    channel: 'Email',
    category: 'email-sms',
    badge: 'Email Inbox',
  },
  {
    label: 'Email Blast Campaigns',
    description: 'Compose newsletters, send bulk workshop promotions, track open rates, bounce logs, and click analytics.',
    href: '/admin/crm/email-campaigns',
    icon: Send,
    gradient: 'from-pink-600 to-rose-700',
    channel: 'Email',
    category: 'email-sms',
    badge: 'Email Blasts',
  },
  {
    label: 'SMS Text Messaging',
    description: 'Direct SMS messaging for urgent workshop alerts, venue updates, critical OTPs, and high-priority SMS reminders.',
    href: '/admin/crm/messages',
    icon: SmartphoneNfc,
    gradient: 'from-amber-500 to-orange-600',
    channel: 'SMS',
    category: 'email-sms',
    badge: 'Text SMS',
  },

  // ── 5. Telegram Suite ──
  {
    label: 'Telegram Bot Chat Console',
    description: 'Interact with Telegram users in real time, answer queries, and distribute workshop recordings seamlessly.',
    href: '/admin/crm/telegram',
    icon: Send,
    gradient: 'from-sky-500 to-blue-600',
    channel: 'Telegram',
    category: 'telegram',
    badge: 'Telegram Bot',
  },
  {
    label: 'Telegram Channel Broadcast',
    description: 'Instant broadcast alerts, links, and PDF materials to public and private student Telegram channels.',
    href: '/admin/crm/telegram/broadcast',
    icon: Radio,
    gradient: 'from-blue-500 to-sky-600',
    channel: 'Telegram',
    category: 'telegram',
    badge: 'Channels',
  },
];

const tabFilters: { key: CommTabKey; label: string; count: (list: CommCard[]) => number }[] = [
  { key: 'all', label: 'All Channels', count: (l) => l.length },
  { key: 'qr', label: 'QR WhatsApp', count: (l) => l.filter(p => p.category === 'qr').length },
  { key: 'meta', label: 'Meta WhatsApp', count: (l) => l.filter(p => p.category === 'meta').length },
  { key: 'calls', label: 'AI Voice Calls', count: (l) => l.filter(p => p.category === 'calls').length },
  { key: 'email-sms', label: 'Email & SMS', count: (l) => l.filter(p => p.category === 'email-sms').length },
  { key: 'telegram', label: 'Telegram', count: (l) => l.filter(p => p.category === 'telegram').length },
];

function CommunicationHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<CommTabKey>('all');
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
    const tab = searchParams.get('tab') as CommTabKey;
    if (tab && ['all', 'qr', 'meta', 'calls', 'email-sms', 'telegram'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: CommTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/communication-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = communicationCards.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.channel.toLowerCase().includes(searchQuery.toLowerCase());
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
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Communication Hub</h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Omnichannel Suite
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Unified multi-channel headquarters for QR WhatsApp, Official Meta WhatsApp, Email campaigns, SMS notifications, AI Voice calls, and Telegram.
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
              placeholder="Search channels, inboxes, bots..."
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-xs"
            />
          </div>
        </div>

        {/* Channel Highlights Badge Row */}
        <div className="mt-5 pt-4 border-t border-emerald-200/50 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Connected Channels:</span>
          <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> QR WhatsApp
          </span>
          <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-green-200 text-green-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Meta WhatsApp Cloud
          </span>
          <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Email
          </span>
          <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> SMS
          </span>
          <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> AI Calling
          </span>
          <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-sky-200 text-sky-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Telegram
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(communicationCards);
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {card.channel}
                    </span>
                    {card.badge && (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                        {card.badge}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-600" />
                </h3>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                <span>Launch Channel</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No channels found</h3>
          <p className="text-sm text-gray-500 mt-1">Try searching with a different channel name or keyword.</p>
        </div>
      )}
    </div>
  );
}

export default function CommunicationHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <CommunicationHubContent />
    </Suspense>
  );
}
