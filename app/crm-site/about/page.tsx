import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, Globe, Users, Lightbulb, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about the mission and team behind Swar Yoga CRM — built for wellness businesses by wellness practitioners.',
};

const VALUES = [
  {
    icon: Heart,
    title: 'Wellness First',
    desc: 'Every feature is designed with wellness businesses in mind — yoga studios, retreat centers, coaching practices, and more.',
    color: 'bg-red-50 text-red-600',
  },
  {
    icon: Globe,
    title: 'Global Reach',
    desc: 'Support for 19 languages in AI voice calls, multi-currency payments, and custom domains for any country.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Lightbulb,
    title: 'Simple by Design',
    desc: 'No IT team needed. Our onboarding auto-configures everything — just enter your details and start.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Users,
    title: 'Community Driven',
    desc: 'We build with our users. Features are prioritized based on real feedback from real businesses.',
    color: 'bg-green-50 text-green-600',
  },
];

const TEAM = [
  { name: 'Mohan Kalburgi', role: 'Founder & CTO', img: '/logo.png' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            Built <span className="text-swar-primary">for Wellness,</span> by Wellness
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            Swar Yoga CRM was born from a simple observation: wellness businesses deserve
            tools as thoughtful as the services they provide. We&apos;re here to make growth
            effortless.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We believe every yoga instructor, wellness coach, and retreat organizer should
                have access to the same powerful business tools that Fortune 500 companies use —
                without the complexity or cost.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Swar Yoga CRM brings together lead management, WhatsApp messaging, AI voice calling,
                payment processing, and community building into one affordable platform that anyone
                can set up in minutes.
              </p>
            </div>
            <div className="bg-gradient-to-br from-swar-primary/5 to-green-50 rounded-2xl p-8 text-center">
              <p className="text-5xl font-bold text-swar-primary mb-2">2024</p>
              <p className="text-gray-600 text-sm">Founded in India</p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">19</p>
                  <p className="text-xs text-gray-500">AI Languages</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">5</p>
                  <p className="text-xs text-gray-500">Plan Tiers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            What We Stand For
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${v.color}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Our Team</h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {TEAM.map((t) => (
              <div key={t.name} className="text-center">
                <img
                  src={t.img}
                  alt={t.name}
                  className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-gray-100 object-cover"
                />
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-swar-primary to-green-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join the Wellness CRM Revolution
          </h2>
          <p className="text-green-100 mb-8">
            Start for free and see how Swar Yoga CRM can transform your business.
          </p>
          <Link
            href="/crm-site/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-swar-primary bg-white hover:bg-gray-50 rounded-xl shadow-lg transition-all"
          >
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
