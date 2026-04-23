'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Database, Unlock, Infinity } from 'lucide-react';

/* ─── Auto-detect India by timezone ─── */
function detectIsIndia(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta';
  } catch {
    return false;
  }
}

/* ─── ALL features included on every plan ─── */
const ALL_FEATURES = [
  'CRM & Lead Management',
  'Funnel & Pipeline',
  'WhatsApp Business API',
  'QR WhatsApp',
  'Broadcast Messaging',
  'AI Voice Calls (19 languages)',
  'Chatbot Builder',
  'Community Module',
  'Workshops & Events',
  'Certificate Generator',
  'Cashfree & PayU Payments',
  'Meta Forms Integration',
  'Life Planner',
  'CSV / Excel Import & Export',
  'SMS & Email Actions',
  'Custom Domain (CNAME)',
  'API Access & Tally Integration',
];

/* ─── Plans — only leads & users differ. Professional = unlimited ─── */
type BillingCycle = '3mo' | '6mo' | '12mo';

const PLANS = [
  {
    tier: 'trial',
    name: 'Free Trial',
    desc: '15 days free • 500 leads • Full access',
    monthlyINR: 0, monthlyUSD: 0,
    leads: '500',
    users: '1',
    chatbots: '5',
    cta: 'Start Free Trial',
    highlight: false,
    badge: '🎉 15 Days Free',
  },
  {
    tier: 'basic',
    name: 'Basic',
    desc: 'Perfect for getting started.',
    monthlyINR: 499, monthlyUSD: 6,
    leads: '500',
    users: '1',
    chatbots: '5',
    cta: 'Upgrade Now',
    highlight: true,
    badge: '⭐ Most Popular',
  },
  {
    tier: 'starter',
    name: 'Starter',
    desc: 'Scale your outreach — 5K leads.',
    monthlyINR: 1299, monthlyUSD: 16,
    leads: '5,000',
    users: '3',
    chatbots: '10',
    cta: 'Get Started',
    highlight: false,
  },
  {
    tier: 'growth',
    name: 'Growth',
    desc: 'For growing teams — 25K leads.',
    monthlyINR: 2400, monthlyUSD: 29,
    leads: '25,000',
    users: '10',
    chatbots: 'Unlimited',
    cta: 'Get Started',
    highlight: false,
  },
  {
    tier: 'professional',
    name: 'Professional',
    desc: 'Unlimited leads. No limits.',
    monthlyINR: 4500, monthlyUSD: 54,
    leads: 'Unlimited',
    users: 'Unlimited',
    chatbots: 'Unlimited',
    cta: 'Get Started',
    highlight: false,
  },
];

/* Billing cycles */
const CYCLES: { id: BillingCycle; label: string; months: number; discount: number }[] = [
  { id: '3mo', label: '3 Months', months: 3, discount: 0 },
  { id: '6mo', label: '6 Months', months: 6, discount: 10 },
  { id: '12mo', label: '1 Year', months: 12, discount: 20 },
];

/* Storage */
const STORAGE_RATE = { inr: 35, usd: 0.45 };

function fmtINR(n: number) {
  if (n === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}
function fmtUSD(n: number) {
  if (n === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('3mo');
  const [isINR, setIsINR] = useState(true);

  useEffect(() => { setIsINR(detectIsIndia()); }, []);

  const sym = isINR ? '₹' : '$';
  const fmt = isINR ? fmtINR : fmtUSD;
  const activeCycle = CYCLES.find((c) => c.id === cycle)!;

  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Every Feature. Every Plan.
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            All features unlocked from day one. You only choose your lead limit.
            <br />
            <span className="text-swar-primary font-semibold">15-day free trial</span> on Free &amp; Basic plans — no credit card required.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            All paid plans are non-refundable &bull; Storage billed per use &bull; Prices exclude GST
          </p>

          {/* Toggles row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {/* Billing cycle */}
            <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {CYCLES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCycle(c.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    cycle === c.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {c.label}
                  {c.discount > 0 && (
                    <span className="text-swar-primary text-xs font-semibold ml-1">-{c.discount}%</span>
                  )}
                </button>
              ))}
            </div>

            {/* Currency */}
            <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setIsINR(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isINR ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                🇮🇳 INR
              </button>
              <button
                onClick={() => setIsINR(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !isINR ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                🌐 USD
              </button>
            </div>
          </div>

          {!isINR && (
            <p className="mt-3 text-xs text-amber-600">
              USD prices include 3% international payment processing fee
            </p>
          )}
        </div>
      </section>

      {/* Plans grid */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {PLANS.map((plan) => {
              const baseMonthly = isINR ? plan.monthlyINR : plan.monthlyUSD;
              const discounted = Math.round(baseMonthly * (1 - activeCycle.discount / 100));
              const totalBill = discounted * activeCycle.months;

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

                  {/* 15-day trial badge — only for Free & Basic */}
                  {(plan.tier === 'free' || plan.tier === 'basic') && (
                    <div className="mb-2">
                      <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded-full border border-green-200">
                        15-DAY FREE TRIAL
                      </span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{plan.desc}</p>

                  <div className="mt-4 mb-4">
                    {baseMonthly === 0 ? (
                      <span className="text-3xl font-bold text-gray-900">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">
                          {sym}{fmt(discounted)}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">/mo</span>
                        {activeCycle.discount > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            <span className="line-through">{sym}{fmt(baseMonthly)}</span>
                            <span className="text-green-600 font-semibold ml-1">Save {activeCycle.discount}%</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {sym}{fmt(totalBill)} billed for {activeCycle.months} months
                        </p>
                      </>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="flex flex-col gap-1 mb-4 p-3 bg-gray-50 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Leads</span>
                      {plan.leads === 'Unlimited' ? (
                        <span className="flex items-center gap-1 font-semibold text-swar-primary">
                          <Infinity className="h-4 w-4" /> Unlimited
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900">{plan.leads}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Users</span>
                      {plan.users === 'Unlimited' ? (
                        <span className="flex items-center gap-1 font-semibold text-swar-primary">
                          <Infinity className="h-4 w-4" /> Unlimited
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900">{plan.users}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Chatbot Flows</span>
                      {plan.chatbots === 'Unlimited' ? (
                        <span className="flex items-center gap-1 font-semibold text-swar-primary">
                          <Infinity className="h-4 w-4" /> Unlimited
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900">{plan.chatbots}</span>
                      )}
                    </div>
                  </div>

                  {/* All features included */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <Unlock className="h-3.5 w-3.5 text-swar-primary" />
                    <span className="text-xs font-semibold text-swar-primary">All features included</span>
                  </div>

                  {/* CTA */}
                  <Link
                    href="/crm-site/signup"
                    className={`mt-auto w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
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

      {/* All features banner */}
      <section className="pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-swar-primary/5 to-blue-50 rounded-2xl border border-swar-primary/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Unlock className="h-6 w-6 text-swar-primary" />
              <h3 className="text-xl font-bold text-gray-900">Every Feature on Every Plan</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              No feature gating. Pick your plan, get full access. As you cross your lead limit, simply upgrade — your data and settings carry over.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-swar-primary flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Storage — pay per use */}
      <section className="pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Storage — Pay Per Use</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              No free storage on any plan. You pay only for what you use, billed in 5 MB slots.
              Minimum purchase: 100 MB.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 border border-blue-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rate per GB / month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isINR ? `₹${STORAGE_RATE.inr}` : `$${STORAGE_RATE.usd}`}
                  <span className="text-sm font-normal text-gray-500 ml-1">/ GB</span>
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-blue-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Billing granularity</p>
                <p className="text-lg font-semibold text-gray-900">5 MB slots</p>
                <p className="text-xs text-gray-500 mt-1">Min. 100 MB purchase required</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Infrastructure: MongoDB Atlas + Bunny Edge Storage + CDN. Price includes 20% service margin.
              {!isINR && ' USD rate includes 3% payment processing fee.'}
            </p>
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
                q: 'Do I get all features on the Free plan too?',
                a: 'Yes! Every feature — WhatsApp, AI Voice, Chatbot, Payments, Community, Workshops — is unlocked on every plan, including Free. The only limit is the number of leads and storage.',
              },
              {
                q: 'How does the 15-day free trial work?',
                a: 'Every plan includes a 15-day free trial with full access. After 15 days your subscription billing begins automatically. No credit card needed to start.',
              },
              {
                q: 'What billing cycles are available?',
                a: 'All paid plans must be purchased for a minimum of 3 months. You can also choose 6 months (10% discount) or 1 year (20% discount). All subscriptions are non-refundable.',
              },
              {
                q: 'Are subscriptions refundable?',
                a: 'No. All paid plans are non-refundable once purchased. We encourage you to use the 15-day free trial to evaluate the platform before committing.',
              },
              {
                q: 'What does Professional include?',
                a: 'Professional gives you unlimited leads and unlimited users at ₹9,999/mo (or $119/mo). All features are included, same as every other plan — you just never hit a lead limit.',
              },
              {
                q: 'When do I need to upgrade?',
                a: 'When you reach your plan\'s lead limit (e.g. 2,000 on Basic), you\'ll be prompted to upgrade. All your data, keys, and settings carry over seamlessly.',
              },
              {
                q: 'Do I get any free storage?',
                a: 'No. Storage is always billed per use on every plan. You must purchase a minimum of 100 MB. This keeps subscription prices low and fair.',
              },
              {
                q: 'Why are there two currencies?',
                a: 'Users in India are billed in INR via UPI, cards, and net banking. Users outside India are billed in USD. USD prices include a 3% international payment processing fee.',
              },
              {
                q: 'Is GST included in the pricing?',
                a: 'Listed prices are exclusive of GST. GST will be added as applicable once we obtain our GST registration.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'India: UPI, debit/credit cards, net banking, wallets via Cashfree. International: Visa, Mastercard, and other major cards.',
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. Each tenant has an isolated database. API keys are encrypted with AES-256-GCM, and all traffic is HTTPS with HSTS.',
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
