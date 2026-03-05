'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    desc: 'Get started with basic CRM — no cost.',
    monthlyPrice: 0,
    annualPrice: 0,
    limits: { leads: '250', users: '1', storage: '100 MB' },
    features: [
      'Lead management',
      'Basic funnel view',
      'Manual lead entry',
      'CSV import/export',
    ],
    notIncluded: ['WhatsApp', 'AI Voice', 'Chatbot', 'Payments', 'Custom domain'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    tier: 'starter',
    name: 'Starter',
    desc: 'WhatsApp messaging for small teams.',
    monthlyPrice: 1999,
    annualPrice: 19990,
    limits: { leads: '5,000', users: '3', storage: '500 MB' },
    features: [
      'Everything in Free',
      'WhatsApp Business API',
      'Broadcast messaging',
      'Meta Forms integration',
      '10 WhatsApp templates',
      '5 broadcasts / day',
    ],
    notIncluded: ['AI Voice', 'Chatbot', 'Payments', 'Custom domain'],
    cta: 'Start Starter',
    highlight: false,
  },
  {
    tier: 'growth',
    name: 'Growth',
    desc: 'Voice AI, payments, and automation.',
    monthlyPrice: 4999,
    annualPrice: 49990,
    limits: { leads: '25,000', users: '10', storage: '2 GB' },
    features: [
      'Everything in Starter',
      'AI Voice Calls (19 languages)',
      'Cashfree & PayU payments',
      'Chatbot builder',
      'Certificate generator',
      '50 templates / 20 broadcasts per day',
    ],
    notIncluded: ['Workshops', 'Custom domain', 'Advanced analytics'],
    cta: 'Start Growth',
    highlight: true,
  },
  {
    tier: 'professional',
    name: 'Professional',
    desc: 'Full-featured with workshops & analytics.',
    monthlyPrice: 9999,
    annualPrice: 99990,
    limits: { leads: '50,000', users: '25', storage: '10 GB' },
    features: [
      'Everything in Growth',
      'Workshops & events',
      'Community module',
      'Life Planner',
      'Advanced analytics',
      'Custom domain (CNAME)',
      '200 templates / 50 broadcasts per day',
    ],
    notIncluded: ['API access', 'Tally integration'],
    cta: 'Start Professional',
    highlight: false,
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    desc: 'Unlimited scale with API access.',
    monthlyPrice: 24999,
    annualPrice: 249990,
    limits: { leads: '100,000', users: 'Unlimited', storage: '50 GB' },
    features: [
      'Everything in Professional',
      'API access for integrations',
      'Tally integration',
      '1,000 templates / 500 broadcasts per day',
      'Priority support',
      'Dedicated account manager',
      'Custom onboarding',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    highlight: false,
  },
];

function formatPrice(price: number) {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(price);
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Start free. Upgrade as you grow. No hidden fees.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                !annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Annual <span className="text-swar-primary text-xs font-semibold ml-1">Save 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans grid */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {PLANS.map((plan) => {
              const price = annual
                ? Math.round(plan.annualPrice / 12)
                : plan.monthlyPrice;

              return (
                <div
                  key={plan.tier}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-lg ${
                    plan.highlight
                      ? 'border-swar-primary ring-2 ring-swar-primary/20'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-swar-primary text-white text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{plan.desc}</p>

                  <div className="mt-4 mb-6">
                    {price === 0 ? (
                      <span className="text-3xl font-bold text-gray-900">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">
                          &#8377;{formatPrice(price)}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">/mo</span>
                        {annual && (
                          <p className="text-xs text-gray-400 mt-1">
                            &#8377;{formatPrice(plan.annualPrice)} billed annually
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="flex gap-4 mb-6 text-xs text-gray-500">
                    <span>{plan.limits.leads} leads</span>
                    <span>{plan.limits.users} users</span>
                    <span>{plan.limits.storage}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-swar-primary flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                        <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={plan.tier === 'enterprise' ? '/crm-site/contact' : '/crm-site/signup'}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      plan.highlight
                        ? 'bg-swar-primary text-white hover:bg-swar-primary-hover shadow'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'Can I start for free?',
                a: 'Yes! The Free plan gives you 250 leads with core CRM features. No credit card required.',
              },
              {
                q: 'Can I upgrade or downgrade anytime?',
                a: 'Absolutely. Upgrade or downgrade from your billing dashboard at any time. Changes take effect immediately.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit/debit cards, UPI, Net Banking, and wallets via Cashfree.',
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. Each tenant has isolated database. API keys are encrypted with AES-256-GCM, and all traffic is HTTPS with HSTS.',
              },
              {
                q: 'Do you offer custom plans?',
                a: 'Yes, for businesses with unique needs. Contact our sales team for a tailored quote.',
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-white rounded-xl p-5 border border-gray-100">
                <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
