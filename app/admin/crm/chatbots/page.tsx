'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner, PageHeader } from '@/components/admin/crm';

type ChatbotRule = {
  _id: string;
  name: string;
  enabled?: boolean;
  triggerType?: string;
  actionType?: string;
  actionText?: string;
  actionTemplateId?: string;
  conditions?: any;
};

type ChatbotFlow = {
  _id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  nodes?: any[];
  createdAt: string;
};

type KnowledgeArticle = {
  _id: string;
  title: string;
  category: string;
  enabled: boolean;
  usageCount: number;
};

type TemplateRow = {
  _id: string;
  templateName: string;
  category?: string;
  language?: string;
  status?: string;
  templateContent?: string;
};

// Chatbot type cards for the dashboard
const CHATBOT_TYPES = [
  {
    id: 'flow-builder',
    icon: '🔀',
    title: 'Flow Builder',
    description: 'Visual drag-and-drop chatbot flow creator with nodes and connections',
    link: '/admin/crm/chatbot-builder',
    color: 'from-purple-500 to-indigo-600',
    features: ['Visual Flow Chart', 'Multiple Node Types', 'Conditional Logic', 'Delay & Timer'],
  },
  {
    id: 'knowledge-base',
    icon: '📚',
    title: 'Knowledge Base',
    description: 'FAQ articles for auto-replies when admin is unavailable',
    link: '/admin/crm/knowledge-base',
    color: 'from-emerald-500 to-teal-600',
    features: ['Auto FAQ Answers', 'Keyword Matching', 'Multi-language', 'Usage Analytics'],
  },
  {
    id: 'automation-rules',
    icon: '⚡',
    title: 'Automation Rules',
    description: 'Trigger-based automated responses for WhatsApp messages',
    link: '/admin/crm/automation',
    color: 'from-orange-500 to-red-600',
    features: ['Welcome Messages', 'Keyword Triggers', 'Template Sending', 'Lead Updates'],
  },
  {
    id: 'ai-agent',
    icon: '🤖',
    title: 'AI Agent',
    description: 'AI-powered responses using OpenAI GPT for complex questions',
    link: '/admin/crm/chatbot-settings',
    color: 'from-blue-500 to-cyan-600',
    features: ['OpenAI Integration', 'Context Awareness', 'Smart Responses', 'Fallback Logic'],
  },
  {
    id: 'quick-replies',
    icon: '💬',
    title: 'Quick Replies',
    description: 'Saved message templates for fast manual responses',
    link: '/admin/crm/templates',
    color: 'from-pink-500 to-rose-600',
    features: ['Canned Responses', 'Shortcuts', 'Categories', 'Usage Tracking'],
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Chatbot Settings',
    description: 'Global configuration for office hours, welcome messages, and escalation',
    link: '/admin/crm/chatbot-settings',
    color: 'from-gray-500 to-slate-600',
    features: ['Office Hours', 'After-Hours Message', 'Escalation Rules', 'Default Response'],
  },
];

export default function ChatbotsPage() {
  const router = useRouter();
  const token = useAuth();

  const crmOptions = useMemo(() => ({ token }), [token]);
  const crm = useCRM(crmOptions);
  const crmFetch = crm.fetch;

  const [stats, setStats] = useState({
    flowsCount: 0,
    activeFlows: 0,
    rulesCount: 0,
    activeRules: 0,
    kbArticles: 0,
    activeKb: 0,
    recentFlows: [] as ChatbotFlow[],
    recentRules: [] as ChatbotRule[],
    recentArticles: [] as KnowledgeArticle[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch flows
      const flowsRes = await crmFetch('/api/admin/crm/chatbot-flows', { params: { limit: 5 } }).catch(() => ({ flows: [] }));
      const flows = Array.isArray(flowsRes?.flows) ? flowsRes.flows : [];
      
      // Fetch automation rules
      const rulesRes = await crmFetch('/api/admin/crm/automations', { params: { limit: 100 } }).catch(() => ({ rules: [] }));
      const rules = Array.isArray(rulesRes?.rules) ? rulesRes.rules : [];
      
      // Fetch knowledge base articles
      const kbRes = await crmFetch('/api/admin/crm/knowledge-base', { params: { limit: 5 } }).catch(() => ({ articles: [], total: 0 }));
      const articles = Array.isArray(kbRes?.articles) ? kbRes.articles : [];
      
      setStats({
        flowsCount: flows.length,
        activeFlows: flows.filter((f: any) => f.enabled).length,
        rulesCount: rules.length,
        activeRules: rules.filter((r: any) => r.enabled).length,
        kbArticles: kbRes?.total || articles.length,
        activeKb: articles.filter((a: any) => a.enabled).length,
        recentFlows: flows.slice(0, 3),
        recentRules: rules.slice(0, 3),
        recentArticles: articles.slice(0, 3),
      });
    } catch (err) {
      console.error('Failed to fetch chatbot stats:', err);
    } finally {
      setLoading(false);
    }
  }, [crmFetch]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchStats();
  }, [token, router, fetchStats]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          title="🤖 Chatbot Center"
          subtitle="Manage all your chatbots, automation rules, and AI responses in one place"
          action={
            <div className="flex gap-3">
              <Link
                href="/admin/crm/whatsapp"
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
              >
                ← WhatsApp
              </Link>
              <Link
                href="/admin/crm/chatbot-builder"
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                + New Flow
              </Link>
              <Link
                href="/admin/crm/knowledge-base"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                + Add FAQ
              </Link>
            </div>
          }
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        {/* Stats Overview */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-3xl font-bold text-purple-600">{stats.flowsCount}</div>
              <div className="text-sm text-gray-600">Chatbot Flows</div>
              <div className="text-xs text-green-600 mt-1">{stats.activeFlows} active</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-3xl font-bold text-orange-600">{stats.rulesCount}</div>
              <div className="text-sm text-gray-600">Automation Rules</div>
              <div className="text-xs text-green-600 mt-1">{stats.activeRules} active</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-3xl font-bold text-emerald-600">{stats.kbArticles}</div>
              <div className="text-sm text-gray-600">KB Articles</div>
              <div className="text-xs text-green-600 mt-1">{stats.activeKb} active</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-3xl font-bold text-blue-600">
                {stats.activeFlows + stats.activeRules + stats.activeKb}
              </div>
              <div className="text-sm text-gray-600">Total Active</div>
              <div className="text-xs text-blue-600 mt-1">Auto-responding</div>
            </div>
          </div>
        )}

        {/* Chatbot Types Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CHATBOT_TYPES.map((type) => (
            <Link
              key={type.id}
              href={type.link}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all hover:border-gray-300"
            >
              <div className={`bg-gradient-to-r ${type.color} p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{type.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold">{type.title}</h3>
                    <p className="text-white/80 text-sm">{type.description}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {type.features.map((feature, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <div className="mt-4 text-right">
                  <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-800">
                    Open →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        {!loading && (stats.recentFlows.length > 0 || stats.recentRules.length > 0 || stats.recentArticles.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Flows */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">🔀 Recent Flows</h3>
                <Link href="/admin/crm/chatbot-builder" className="text-sm text-purple-600 hover:underline">
                  View All
                </Link>
              </div>
              {stats.recentFlows.length === 0 ? (
                <p className="text-gray-500 text-sm">No flows created yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentFlows.map((flow) => (
                    <div key={flow._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{flow.name}</div>
                        <div className="text-xs text-gray-500">{flow.nodes?.length || 0} nodes</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        flow.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {flow.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Rules */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">⚡ Recent Rules</h3>
                <Link href="/admin/crm/automation" className="text-sm text-orange-600 hover:underline">
                  View All
                </Link>
              </div>
              {stats.recentRules.length === 0 ? (
                <p className="text-gray-500 text-sm">No rules created yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentRules.map((rule) => (
                    <div key={rule._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{rule.name}</div>
                        <div className="text-xs text-gray-500">{rule.triggerType} → {rule.actionType}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rule.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent KB Articles */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">📚 Recent Articles</h3>
                <Link href="/admin/crm/knowledge-base" className="text-sm text-emerald-600 hover:underline">
                  View All
                </Link>
              </div>
              {stats.recentArticles.length === 0 ? (
                <p className="text-gray-500 text-sm">No articles added yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentArticles.map((article) => (
                    <div key={article._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 line-clamp-1">{article.title}</div>
                        <div className="text-xs text-gray-500">{article.category} • Used {article.usageCount}x</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        article.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {article.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">🔄 How Auto-Reply Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">📱</div>
              <h3 className="font-bold">1. Message Received</h3>
              <p className="text-white/70 text-sm">User sends WhatsApp message (Meta or QR)</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🕐</div>
              <h3 className="font-bold">2. Check Availability</h3>
              <p className="text-white/70 text-sm">System checks if admin is online & within office hours</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">📚</div>
              <h3 className="font-bold">3. Search Knowledge Base</h3>
              <p className="text-white/70 text-sm">If admin unavailable, bot searches KB for matching answer</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="font-bold">4. Auto-Reply</h3>
              <p className="text-white/70 text-sm">Bot sends response from KB, AI, or default message</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
