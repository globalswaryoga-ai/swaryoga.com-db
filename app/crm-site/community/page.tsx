import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, MessageSquare, Lightbulb, Calendar, ArrowRight, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Community',
  description: 'Join the Swar Yoga CRM community — connect with wellness business owners, share tips, and grow together.',
};

const BENEFITS = [
  {
    icon: Users,
    title: 'Connect with Peers',
    desc: 'Network with yoga studios, coaches, and retreat organizers who use Swar Yoga CRM.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: MessageSquare,
    title: 'Get Help Fast',
    desc: 'Ask questions with community members and our support team for quick answers.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: Lightbulb,
    title: 'Share Ideas',
    desc: 'Vote on feature requests and shape the product roadmap with your input.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Calendar,
    title: 'Exclusive Events',
    desc: 'Join webinars, workshops, and product walkthroughs hosted by the Swar Yoga team.',
    color: 'bg-purple-50 text-purple-600',
  },
];

const TOPICS = [
  'Lead generation tips',
  'WhatsApp template best practices',
  'AI voice call strategies',
  'Payment workflow optimization',
  'Onboarding new team members',
  'Chatbot conversation design',
  'CRM automation ideas',
  'Multi-tenant setup guides',
];

export default function CommunityPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-swar-primary-light to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-swar-primary/10 text-swar-primary text-sm font-medium mb-6">
            <Globe className="h-4 w-4" />
            Open Community
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            Grow Together with the
            <span className="block text-swar-primary">Swar Yoga Community</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            A space for wellness business owners to learn, share, and support each other.
            Whether you&apos;re just starting or scaling — you belong here.
          </p>
          <div className="mt-8">
            <Link
              href="/crm-site/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow-lg transition-all"
            >
              Join the Community <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Why Join?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="text-center p-6 rounded-2xl border border-gray-100 hover:shadow-md transition">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${b.color}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-gray-600">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Discussion Topics</h2>
          <p className="text-gray-600 mb-10">See what businesses like yours are talking about.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {TOPICS.map((t) => (
              <span
                key={t}
                className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:border-swar-primary hover:text-swar-primary transition cursor-default"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">500+</p>
              <p className="text-sm text-gray-500 mt-1">Members</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">50+</p>
              <p className="text-sm text-gray-500 mt-1">Discussions / week</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">24h</p>
              <p className="text-sm text-gray-500 mt-1">Avg response time</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-swar-primary to-green-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Join?
          </h2>
          <p className="text-green-100 mb-8">
            Sign up for Swar Yoga CRM (free) and get automatic access to the community.
          </p>
          <Link
            href="/crm-site/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-swar-primary bg-white hover:bg-gray-50 rounded-xl shadow-lg transition-all"
          >
            Sign Up & Join <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
