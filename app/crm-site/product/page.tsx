import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Users,
  MessageSquare,
  Phone,
  BarChart3,
  Bot,
  CreditCard,
  Megaphone,
  Tag,
  FileText,
  Shield,
  Globe,
  Layers,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Smartphone,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Product — Features',
  description: 'Explore every feature of Swar Yoga CRM — lead management, WhatsApp, AI voice, payments, chatbot, and more.',
};

const FEATURE_SECTIONS = [
  {
    id: 'leads',
    icon: Users,
    title: 'Lead Management',
    desc: 'Capture, organize, and convert leads with smart sales funnels.',
    color: 'text-blue-600 bg-blue-50',
    bullets: [
      'Auto-capture leads from WhatsApp, Meta forms, and website',
      'Custom funnel stages — drag-and-drop pipeline view',
      'Lead scoring and auto-assignment to team members',
      'Bulk import/export via CSV',
      'Duplicate detection with phone normalization',
    ],
  },
  {
    id: 'whatsapp',
    icon: MessageSquare,
    title: 'WhatsApp Business API',
    desc: 'Official Meta integration for transactional and marketing messages.',
    color: 'text-green-600 bg-green-50',
    bullets: [
      'Send template messages & broadcasts to thousands',
      'Real-time two-way chat with delivery receipts',
      'Media support — images, PDFs, videos',
      'Auto-translate templates via Gemini AI',
      'Template duplicate and quick-send workflows',
    ],
  },
  {
    id: 'voice',
    icon: Phone,
    title: 'AI Voice Calling',
    desc: 'Automated outbound calls in 19 languages powered by Retell AI.',
    color: 'text-purple-600 bg-purple-50',
    bullets: [
      'Single and bulk calling with one click',
      'Supports Hindi, English, Marathi, Spanish, Arabic, and 14 more',
      'Automatic language-to-agent mapping',
      'Call history and transcript recording',
      'Sentiment analysis and call outcome tracking',
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payments & Billing',
    desc: 'Collect payments seamlessly with Cashfree and PayU.',
    color: 'text-amber-600 bg-amber-50',
    bullets: [
      'Cashfree SDK v3 embedded checkout',
      'PayU integration for Indian cards/UPI/NetBanking',
      'Subscription and recurring billing management',
      'Automatic invoice generation per tenant',
      'Payment status webhooks and reconciliation',
    ],
  },
  {
    id: 'chatbot',
    icon: Bot,
    title: 'Chatbot Builder',
    desc: 'Build no-code WhatsApp chatbots with a visual flow editor.',
    color: 'text-pink-600 bg-pink-50',
    bullets: [
      'Drag-and-drop flow builder',
      'Keyword triggers and fallback responses',
      'Collect user data and save to lead records',
      'Rich message types — buttons, lists, media',
      'Analytics on chatbot engagement',
    ],
  },
  {
    id: 'broadcasts',
    icon: Megaphone,
    title: 'Broadcasts & Campaigns',
    desc: 'Reach your audience at scale with targeted campaigns.',
    color: 'text-red-600 bg-red-50',
    bullets: [
      'Segment leads by funnel stage, label, or custom filter',
      'Schedule broadcasts for optimal send times',
      'Track delivered, read, and replied rates',
      'A/B test message templates',
      'Daily broadcast limit controls per plan',
    ],
  },
  {
    id: 'reports',
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'Real-time dashboards to measure everything that matters.',
    color: 'text-teal-600 bg-teal-50',
    bullets: [
      'Lead conversion and revenue dashboards',
      'Team performance scorecards',
      'Call and message delivery metrics',
      'Funnel stage conversion analysis',
      'Export reports as CSV or PDF',
    ],
  },
  {
    id: 'templates',
    icon: FileText,
    title: 'Template Manager',
    desc: 'Create, duplicate, and auto-translate WhatsApp templates.',
    color: 'text-indigo-600 bg-indigo-50',
    bullets: [
      'Pre-approved template library',
      'One-click duplicate with variable mapping',
      'AI auto-translate via Google Gemini',
      'Header media and CTA button support',
      'Approval status tracking',
    ],
  },
  {
    id: 'roles',
    icon: Shield,
    title: 'Roles & Permissions',
    desc: 'Control who can see, edit, and manage every module.',
    color: 'text-gray-600 bg-gray-50',
    bullets: [
      '5 built-in roles — superadmin, admin, manager, dm, user',
      'Module-level access gating',
      'Audit log for admin actions',
      'Secure JWT authentication with token rotation',
      'IP rate limiting per user bucket',
    ],
  },
  {
    id: 'multi-tenant',
    icon: Layers,
    title: 'Multi-Tenant SaaS',
    desc: 'Run multiple businesses on isolated databases from one platform.',
    color: 'text-orange-600 bg-orange-50',
    bullets: [
      'Database-per-tenant isolation',
      'Custom subdomain and CNAME support',
      'Per-tenant encrypted API key vault (AES-256-GCM)',
      'Usage metering and plan enforcement',
      'Master admin dashboard for tenant oversight',
    ],
  },
];

export default function ProductPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            One Platform. <span className="text-swar-primary">Every Tool.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            From lead capture to payment collection, AI voice to WhatsApp — Swar Yoga CRM consolidates
            everything into a single, powerful workspace.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/crm-site/signup"
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow transition-all"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/crm-site/pricing"
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          {FEATURE_SECTIONS.map((f, idx) => {
            const Icon = f.icon;
            const isReversed = idx % 2 === 1;
            return (
              <div
                key={f.id}
                id={f.id}
                className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-start gap-12`}
              >
                {/* Icon + Title */}
                <div className="md:w-5/12">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${f.color} mb-4`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{f.title}</h2>
                  <p className="text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
                {/* Bullets */}
                <div className="md:w-7/12 bg-gray-50 rounded-2xl p-6 sm:p-8">
                  <ul className="space-y-3">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                        <CheckCircle2 className="h-5 w-5 text-swar-primary flex-shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Integrations bar */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
            Integrations Built-In
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400">
            <span className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-5 w-5 text-green-500" /> WhatsApp Meta API</span>
            <span className="flex items-center gap-2 text-sm font-medium"><Phone className="h-5 w-5 text-purple-500" /> Retell AI</span>
            <span className="flex items-center gap-2 text-sm font-medium"><CreditCard className="h-5 w-5 text-amber-500" /> Cashfree</span>
            <span className="flex items-center gap-2 text-sm font-medium"><CreditCard className="h-5 w-5 text-blue-500" /> PayU</span>
            <span className="flex items-center gap-2 text-sm font-medium"><Globe className="h-5 w-5 text-red-500" /> Google Gemini</span>
            <span className="flex items-center gap-2 text-sm font-medium"><Calendar className="h-5 w-5 text-teal-500" /> Zoom</span>
            <span className="flex items-center gap-2 text-sm font-medium"><Smartphone className="h-5 w-5 text-indigo-500" /> Tally</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-gray-600 mb-8">
            Start with the free plan — upgrade anytime as your business grows.
          </p>
          <Link
            href="/crm-site/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow-lg transition-all"
          >
            Start Free Trial <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
