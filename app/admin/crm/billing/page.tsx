'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Loader } from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/crm/subscription', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubscription(data.subscription);
      } else {
        setError(data.error || 'Failed to load subscription');
      }
    } catch (err) {
      setError('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 499,
      period: '/month',
      description: 'Perfect for getting started',
      badge: '15 days free',
      limits: {
        leads: 2000,
        teamMembers: 1,
        workflows: 5,
        emailPerMonth: 2000,
        storage: '1GB included, ₹50/1GB extra',
      },
      features: [
        'Leads Management (2000 leads)',
        'Team Members (1 user)',
        'WhatsApp Messaging',
        'Telegram Integration',
        'Email (2000/month)',
        'QR Code Generation',
        'Broadcast Templates',
        'Automation (5 workflows)',
        'Basic Reports',
        '1GB Storage',
        '15 days free trial',
      ],
    },
    {
      id: 'copper',
      name: 'Copper',
      price: 999,
      period: '/month',
      description: 'For small teams',
      limits: {
        leads: 5000,
        teamMembers: 3,
        workflows: 10,
        emailPerMonth: 5000,
        storage: '5GB included, ₹50/1GB extra',
      },
      features: [
        'Everything in Basic',
        'Leads Management (5000 leads)',
        'Team Members (3 users)',
        'AI Chatbots',
        'Advanced Automation (10 workflows)',
        'Email (5000/month)',
        'Advanced Analytics',
        'Team Collaboration',
        'Priority Support (24hr)',
        '5GB Storage',
      ],
    },
    {
      id: 'silver',
      name: 'Silver',
      price: 1999,
      period: '/month',
      description: 'For growing teams',
      limits: {
        leads: 15000,
        teamMembers: 10,
        workflows: 'Unlimited',
        emailPerMonth: 10000,
        storage: '20GB included, ₹50/1GB extra',
      },
      features: [
        'Everything in Copper',
        'Leads Management (15000 leads)',
        'Team Members (10 users)',
        'Unlimited Workflows',
        'Email (10000/month)',
        'Voice AI Integration',
        'Payment Processing',
        'Certificates Module',
        'Community Features',
        '20GB Storage',
        'API Access (50K req/month)',
      ],
    },
    {
      id: 'golden',
      name: 'Golden',
      price: 2999,
      period: '/month',
      description: 'For larger enterprises',
      limits: {
        leads: 50000,
        teamMembers: 25,
        workflows: 'Unlimited',
        emailPerMonth: 50000,
        storage: '50GB included, ₹50/1GB extra',
      },
      features: [
        'Everything in Silver',
        'Leads Management (50000 leads)',
        'Team Members (25 users)',
        'Email (50000/month)',
        'Workshops Module',
        'Life Planner',
        'Advanced Analytics',
        'Custom Domain',
        'Dedicated Support',
        '50GB Storage',
        'API Access (500K req/month)',
      ],
    },
    {
      id: 'diamond',
      name: 'Diamond',
      price: 4999,
      period: '/month',
      description: 'Enterprise solutions',
      badge: '50 users',
      limits: {
        leads: 'Unlimited',
        teamMembers: 50,
        workflows: 'Unlimited',
        emailPerMonth: 'Unlimited',
        storage: '500GB included, ₹50/1GB extra',
      },
      features: [
        'Everything in Golden',
        'Unlimited Leads',
        'Team Members (50 users)',
        'Unlimited Email',
        'Unlimited Automation',
        'Tally Integration',
        'Full API Access',
        'Dedicated Account Manager',
        'Custom Solutions',
        'SLA Guarantee (99.9%)',
        '500GB Storage',
        'Priority Support (1hr)',
        'Training & Onboarding',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/crm" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Plan & Billing</h1>
          </div>
          <p className="text-gray-600">Manage your subscription and billing</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="mb-12 bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {error}
          </div>
        ) : subscription ? (
          <div className="mb-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Current Plan: {subscription.currentPlan?.charAt(0).toUpperCase() + subscription.currentPlan?.slice(1)}
            </h2>
            {subscription.status === 'trial' && subscription.trialDaysRemaining ? (
              <p className="text-gray-600 mb-4">
                Trial • {subscription.trialDaysRemaining} days remaining
              </p>
            ) : subscription.status === 'expired' ? (
              <p className="text-red-600 mb-4 font-semibold">Trial Expired • Please select a plan to continue</p>
            ) : (
              <p className="text-gray-600 mb-4">₹{plans.find(p => p.id === subscription.currentPlan)?.price || 499}/month</p>
            )}
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
              Manage Subscription
            </button>
          </div>
        ) : null}

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isActive = subscription?.currentPlan === plan.id;
            return (
            <div
              key={plan.name}
              className={`rounded-lg border-2 p-6 transition-all ${
                isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              {isActive && (
                <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3">
                  CURRENT PLAN
                </span>
              )}
              {!isActive && (plan as any).badge && (
                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold mb-3">
                  {(plan as any).badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
                <span className="text-gray-600">{plan.period}</span>
              </div>
              <button
                className={`w-full py-2 rounded-lg font-medium transition-colors mb-6 ${
                  isActive
                    ? 'bg-gray-200 text-gray-600 cursor-default'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={isActive}
              >
                {isActive ? 'Current Plan' : 'Upgrade'}
              </button>
              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>

        {subscription && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600 text-sm mb-2">Storage Used</p>
              <p className="text-3xl font-bold text-gray-900">{subscription.storageUsedGB} GB</p>
              <p className="text-xs text-gray-600 mt-2">of {subscription.storageIncludedGB} GB included</p>
              {subscription.storageUsedGB > 0 && (
                <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full"
                    style={{
                      width: `${Math.min((subscription.storageUsedGB / subscription.storageIncludedGB) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600 text-sm mb-2">Storage Cost</p>
              <p className="text-3xl font-bold text-green-600">
                ₹{Math.max(0, (subscription.storageUsedGB - subscription.storageIncludedGB) * 50)}/mo
              </p>
              <p className="text-xs text-gray-600 mt-2">₹50/GB for extra storage</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600 text-sm mb-2">
                {subscription.status === 'trial' ? 'Trial Expires' : 'Next Billing'}
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {subscription.status === 'trial' && subscription.trialEndsAt
                  ? new Date(subscription.trialEndsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                  : subscription.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : '-'}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {subscription.status === 'trial' && subscription.trialEndsAt
                  ? new Date(subscription.trialEndsAt).getFullYear()
                  : subscription.nextBillingDate
                    ? new Date(subscription.nextBillingDate).getFullYear()
                    : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
