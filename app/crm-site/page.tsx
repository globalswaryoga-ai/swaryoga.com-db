import Link from 'next/link';
import {
  Users,
  MessageSquare,
  Phone,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Bot,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Star,
} from 'lucide-react';

const HERO_STATS = [
  { value: '10K+', label: 'Leads Managed' },
  { value: '50K+', label: 'Messages Sent' },
  { value: '19', label: 'AI Languages' },
  { value: '99.9%', label: 'Uptime' },
];

const FEATURES = [
  {
    icon: Users,
    title: 'Lead Management',
    desc: 'Track every lead from first touch to conversion with smart funnels and auto-assignment.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Business',
    desc: 'Send broadcasts, templates, and 1-on-1 chats via official Meta Business API.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: Phone,
    title: 'AI Voice Calls',
    desc: 'Automated outbound calls in 19 languages powered by Retell AI — single or bulk.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: CreditCard,
    title: 'Payments & Billing',
    desc: 'Accept payments via Cashfree and PayU. Automatic invoicing and subscription billing.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Bot,
    title: 'Chatbot Builder',
    desc: 'Build WhatsApp chatbots with a visual flow builder — no code required.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'Real-time dashboards for lead conversion, revenue, call performance, and team activity.',
    color: 'bg-teal-50 text-teal-600',
  },
];

const STEPS = [
  { step: '1', title: 'Sign Up', desc: 'Create your account in under 60 seconds. No credit card required.' },
  { step: '2', title: 'Connect', desc: 'Add your WhatsApp number, payment keys, and team members.' },
  { step: '3', title: 'Grow', desc: 'Start managing leads, sending messages, and closing deals.' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Yoga Studio Owner',
    text: 'Swar Yoga CRM transformed how we handle leads. WhatsApp integration alone doubled our conversions.',
    rating: 5,
  },
  {
    name: 'Rahul Mehta',
    role: 'Wellness Coach',
    text: 'The AI voice calling in Hindi is incredible. I can reach 500 leads in an hour without lifting a finger.',
    rating: 5,
  },
  {
    name: 'Anjali Patel',
    role: 'Retreat Organizer',
    text: 'Finally a CRM that understands wellness businesses. The billing system saves me hours every week.',
    rating: 5,
  },
];

export default function CrmHomePage() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-swar-primary-light">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(30,127,67,0.08),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-swar-primary/10 text-swar-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Built for Wellness Businesses
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
              Your All-in-One
              <span className="block text-swar-primary mt-1">CRM Platform</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Manage leads, WhatsApp messaging, AI voice calls, payments, and billing —
              everything your business needs, in one powerful platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/crm-site/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/crm-site/product"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
              >
                See Features
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything You Need to Grow
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From lead capture to payment collection — one platform, zero friction.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color} mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Get Started in 3 Steps
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              No complex setup. No IT team needed. Just sign up and go.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-swar-primary text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Loved by Wellness Businesses
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&quot;{t.text}&quot;</p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust / Security ─── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <Shield className="h-16 w-16 text-swar-primary flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise-Grade Security</h3>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-swar-primary" /> AES-256 Encryption</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-swar-primary" /> SOC 2 Ready</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-swar-primary" /> Role-Based Access</span>
                <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-swar-primary" /> 99.9% Uptime SLA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-gradient-to-br from-swar-primary to-green-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-green-100 mb-10">
            Join hundreds of wellness businesses already growing with Swar Yoga CRM.
            Free plan available — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/crm-site/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-swar-primary bg-white hover:bg-gray-50 rounded-xl shadow-lg transition-all"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/crm-site/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white border-2 border-white/30 hover:border-white/60 rounded-xl transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
