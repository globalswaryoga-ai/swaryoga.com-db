'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Zap,
  Bot,
  Sparkles,
  GitBranch,
  Cpu,
  BookOpen,
  MessageSquare,
  QrCode,
  PhoneCall,
  Settings,
  ArrowRight,
  Search,
  Workflow,
  Sliders,
  PlusCircle,
  Radio,
  FileCode,
  Volume2,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

type AutoTabKey = 'all' | 'ai-chat' | 'agents-rag' | 'workflows' | 'voice';

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
  category: 'ai-chat' | 'agents-rag' | 'workflows' | 'voice';
  primaryActionLabel?: string;
  features: string[];
}

const automationPages: PageCard[] = [
  // ── 1. AI, Chatbots & Visual Chatflow ──
  {
    id: 'chatflow-builder',
    label: 'Visual Chatflow Builder',
    tagline: 'Interactive Canvas Studio',
    description: 'Drag-and-drop conversational canvas to architect multi-step decision trees, buttons, media triggers, and user paths.',
    href: '/admin/crm/chatbot-builder',
    icon: GitBranch,
    gradient: 'from-purple-600 via-indigo-600 to-blue-600',
    badge: 'Visual Studio',
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-200',
    category: 'ai-chat',
    primaryActionLabel: 'Launch Builder',
    features: ['Drag & Drop Nodes', 'Conditional Branching', 'Real-time Flow Test'],
  },
  {
    id: 'create-chat-flow',
    label: 'Create Chatbot Flow',
    tagline: '1-Click Flow Generator',
    description: 'Instantly initialize a new conversation chatflow with starter templates (Lead Magnet, FAQ Bot, Workshop Registration).',
    href: '/admin/crm/chatbot-builder?action=new',
    icon: PlusCircle,
    gradient: 'from-pink-500 via-rose-500 to-amber-500',
    badge: 'Fast Create',
    badgeColor: 'bg-pink-500/10 text-pink-600 border-pink-200',
    category: 'ai-chat',
    primaryActionLabel: 'Create New Flow',
    features: ['Pre-built Templates', 'Multi-channel Output', 'Instant Deploy'],
  },
  {
    id: 'chatbots-manager',
    label: 'AI Chatbots Manager',
    tagline: 'Multi-Channel Bots Fleet',
    description: 'Configure, deploy, and inspect intelligent conversational bots across WhatsApp, Website Live Chat, and Telegram.',
    href: '/admin/crm/chatbots',
    icon: Bot,
    gradient: 'from-indigo-500 via-violet-600 to-purple-700',
    badge: 'Active Fleet',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    category: 'ai-chat',
    primaryActionLabel: 'Manage Bots',
    features: ['WhatsApp & Web Live', 'Session Handling', 'Handoff to Human'],
  },
  {
    id: 'node-editor',
    label: 'Chatflow Node & Canvas Editor',
    tagline: 'Logic & Fallback Tuning',
    description: 'Fine-tune individual conversation nodes, action webhooks, button menus, and fallback triggers on the canvas.',
    href: '/admin/crm/chatbots/editor',
    icon: Sliders,
    gradient: 'from-violet-500 via-fuchsia-600 to-pink-600',
    badge: 'Node Canvas',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200',
    category: 'ai-chat',
    primaryActionLabel: 'Open Canvas',
    features: ['Interactive Nodes', 'Payload Mapping', 'Fallback Handlers'],
  },
  {
    id: 'qr-chatbot',
    label: 'QR WhatsApp Chatbot',
    tagline: 'Dedicated QR Line Bot',
    description: 'Conversational chatbot flows designed specifically for the QR WhatsApp connected business number.',
    href: '/admin/crm/qr/chatbot',
    icon: QrCode,
    gradient: 'from-cyan-600 via-teal-600 to-emerald-600',
    badge: 'QR WhatsApp',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
    category: 'ai-chat',
    primaryActionLabel: 'Open QR Bot',
    features: ['Device Sync', 'Auto Welcome', 'Menu Navigation'],
  },

  // ── 2. Autonomous Agents & Knowledge RAG ──
  {
    id: 'ai-agents',
    label: 'Autonomous AI Agents',
    tagline: 'LLM Intelligent Workers',
    description: 'Intelligent Swar Yoga autonomous agents powered by GPT-4o & Claude for smart customer support and intent discovery.',
    href: '/admin/crm/ai-agents',
    icon: Sparkles,
    gradient: 'from-pink-600 via-purple-600 to-indigo-600',
    badge: 'LLM Agents',
    badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-200',
    category: 'agents-rag',
    primaryActionLabel: 'Configure Agents',
    features: ['GPT-4o & Claude Runtimes', 'Intent Extraction', 'Autonomous Actions'],
  },
  {
    id: 'knowledge-base',
    label: 'AI Knowledge Base & RAG',
    tagline: 'Embeddings & Scripture Docs',
    description: 'Vector embeddings database trained on Swar Yoga literature, workshop FAQs, health guidelines, and practice schedules.',
    href: '/admin/crm/knowledge-base',
    icon: BookOpen,
    gradient: 'from-amber-500 via-orange-600 to-red-500',
    badge: 'Vector Embeddings',
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-200',
    category: 'agents-rag',
    primaryActionLabel: 'Browse Knowledge',
    features: ['PDF & Text Ingestion', 'Semantic Search', 'Verified Accuracy'],
  },
  {
    id: 'chatbot-settings',
    label: 'Chatbot Global Configuration',
    tagline: 'Global Behavioral Guardrails',
    description: 'Set bot personas, tone guidelines, human handoff timeout rules, system error messages, and API tokens.',
    href: '/admin/crm/chatbot-settings',
    icon: Settings,
    gradient: 'from-slate-700 via-gray-800 to-zinc-900',
    badge: 'Guardrails & Config',
    badgeColor: 'bg-slate-500/10 text-slate-700 border-slate-200',
    category: 'agents-rag',
    primaryActionLabel: 'Adjust Settings',
    features: ['Persona & Tone Tuning', 'Human Agent Escalation', 'Session Timeouts'],
  },

  // ── 3. Automated Workflows & Trigger Rules ──
  {
    id: 'workflows-engine',
    label: 'CRM Automation Workflows',
    tagline: 'Event-Driven Pipeline',
    description: 'Automate lead tagging, status progression, delayed email/WhatsApp alerts, and webhook webhooks based on CRM triggers.',
    href: '/admin/crm/workflows',
    icon: Workflow,
    gradient: 'from-yellow-500 via-amber-600 to-orange-600',
    badge: 'Event Driven',
    badgeColor: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    category: 'workflows',
    primaryActionLabel: 'View Workflows',
    features: ['Trigger → Action Chains', 'Delayed Follow-ups', 'CRM Sync'],
  },
  {
    id: 'whatsapp-rules',
    label: 'WhatsApp Welcome & Keyword Rules',
    tagline: 'Instant Responder Rules',
    description: 'Automated welcome responses for first-time contacts, keyword matching rules, and instant answer templates.',
    href: '/admin/crm/automation/rules',
    icon: MessageSquare,
    gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    badge: 'Keyword Rules',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    category: 'workflows',
    primaryActionLabel: 'Edit Rules',
    features: ['Exact & Fuzzy Keywords', 'Welcome Messages', 'Throttling Per Lead'],
  },
  {
    id: 'qr-automation',
    label: 'QR WhatsApp Automation',
    tagline: 'Device-Level Auto Replies',
    description: 'Keyword-based auto-responders and customized welcome announcements running directly on your linked QR WhatsApp device.',
    href: '/admin/crm/qr/automation',
    icon: Layers,
    gradient: 'from-teal-500 via-cyan-600 to-blue-600',
    badge: 'QR Rules',
    badgeColor: 'bg-teal-500/10 text-teal-700 border-teal-200',
    category: 'workflows',
    primaryActionLabel: 'Open QR Rules',
    features: ['Device Keywords', 'Away Messages', 'Auto Contact Saving'],
  },

  // ── 4. AI Voice & Outbound Telephony ──
  {
    id: 'voice-calling',
    label: 'AI Voice Calling Hub',
    tagline: 'Autonomous Voice Agents',
    description: 'Outbound AI voice calling agents for workshop reminders, payment follow-ups, and natural spoken feedback.',
    href: '/admin/crm/calls',
    icon: PhoneCall,
    gradient: 'from-blue-600 via-indigo-600 to-violet-700',
    badge: 'Voice Telephony',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-200',
    category: 'voice',
    primaryActionLabel: 'Voice Dashboard',
    features: ['Human-like Voice', 'Natural Conversing', 'Call Logs & Transcripts'],
  },
  {
    id: 'voice-broadcasts',
    label: 'Voice Outbound Broadcasts',
    tagline: 'Bulk Audio Broadcasts',
    description: 'Schedule mass outbound audio campaigns and interactive IVR phone alerts to registered workshop participants.',
    href: '/admin/crm/calls/broadcasts',
    icon: Radio,
    gradient: 'from-sky-500 via-blue-600 to-indigo-700',
    badge: 'Outbound Audio',
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-200',
    category: 'voice',
    primaryActionLabel: 'Schedule Broadcast',
    features: ['Batch Calling', 'IVR Feedback', 'Call Delivery Stats'],
  },
  {
    id: 'voice-agents-config',
    label: 'Voice Agents & Scripts',
    tagline: 'Custom Voice Personas',
    description: 'Design custom voice agent scripts, speech parameters (pitch, speed), accent selection, and interactive questions.',
    href: '/admin/crm/calls/agents',
    icon: Volume2,
    gradient: 'from-cyan-600 via-blue-600 to-purple-600',
    badge: 'Agent Scripts',
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-200',
    category: 'voice',
    primaryActionLabel: 'Edit Scripts',
    features: ['Custom Speech Tuning', 'Indian & English Accents', 'Script Prompts'],
  },
];

const tabFilters: { key: AutoTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Modules & Tools', count: (l) => l.length },
  { key: 'ai-chat', label: 'AI, Bots & Chatflows', count: (l) => l.filter(p => p.category === 'ai-chat').length },
  { key: 'agents-rag', label: 'Autonomous Agents & RAG', count: (l) => l.filter(p => p.category === 'agents-rag').length },
  { key: 'workflows', label: 'Workflows & Rules', count: (l) => l.filter(p => p.category === 'workflows').length },
  { key: 'voice', label: 'AI Voice & Telephony', count: (l) => l.filter(p => p.category === 'voice').length },
];

function AutomationHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AutoTabKey>('all');
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
    const tab = searchParams.get('tab') as AutoTabKey;
    if (tab && ['all', 'ai-chat', 'agents-rag', 'workflows', 'voice'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: AutoTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/automation${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = useMemo(() => {
    return automationPages.filter((card) => {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Hero Banner ── */}
      <div className="bg-gradient-to-r from-violet-950 via-purple-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-purple-950/30 relative overflow-hidden border border-purple-800/40">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-fuchsia-500/30 flex-shrink-0">
              <Zap className="w-8 h-8 text-cyan-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Automation, AI & Chatflows
                </h1>
                <span className="bg-fuchsia-500/20 text-fuchsia-300 text-xs font-bold px-3 py-1 rounded-full border border-fuchsia-400/30 uppercase tracking-wider">
                  AI & Engine Hub
                </span>
              </div>
              <p className="text-sm text-purple-200/80 mt-1.5 max-w-2xl leading-relaxed">
                Design conversational chatflows, launch autonomous LLM agents, train RAG embeddings, and orchestrate trigger-based CRM automations.
              </p>
            </div>
          </div>

          {/* Quick Actions & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/admin/crm/chatbot-builder?action=new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Chatflow</span>
            </Link>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-purple-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AI tools & flows..."
                className="w-full bg-white/10 backdrop-blur-md border border-white/15 pl-10 pr-4 py-2.5 text-sm rounded-xl text-white placeholder-purple-200/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-fuchsia-300 font-medium block">Visual Studio</span>
            <span className="text-base sm:text-lg font-extrabold text-white">Chatflow + Canvas</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-cyan-300 font-medium block">Autonomous AI</span>
            <span className="text-base sm:text-lg font-extrabold text-white">GPT-4o & Claude</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-purple-300 font-medium block">Knowledge RAG</span>
            <span className="text-base sm:text-lg font-extrabold text-white">Vector Embeddings</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-pink-300 font-medium block">Voice Telephony</span>
            <span className="text-base sm:text-lg font-extrabold text-white">AI Spoken Calling</span>
          </div>
        </div>
      </div>

      {/* ── Category Filter Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(automationPages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-purple-500/80 text-white' : 'bg-gray-200 text-gray-700'
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
              className="group bg-white rounded-2xl border border-gray-200/90 hover:border-purple-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden"
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
                  <div className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">
                    {card.tagline}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
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
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500/70" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-gray-100 mt-2">
                <Link
                  href={card.href}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-semibold text-xs sm:text-sm transition-all duration-200 group/btn"
                >
                  <span>{card.primaryActionLabel || 'Launch Module'}</span>
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
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No automation tools found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            We couldn't find any tool matching "{searchQuery}". Try searching for keywords like "chatflow", "agents", "rules", or "voice".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveTab('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-700 transition"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* ── Footer Summary Strip ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-500 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>
            Displaying <strong>{filteredCards.length}</strong> active modules in{' '}
            <strong className="text-gray-700">{tabFilters.find((t) => t.key === activeTab)?.label}</strong>
          </span>
        </div>
        <div className="text-gray-400 text-xs">
          Total: {automationPages.length} AI & Automation Tools Configured
        </div>
      </div>
    </div>
  );
}

export default function AutomationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      }
    >
      <AutomationHubContent />
    </Suspense>
  );
}
