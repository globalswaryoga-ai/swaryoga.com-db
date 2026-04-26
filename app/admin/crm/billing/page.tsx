'use client';

import React, { useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const plans = [
    {
      name: 'Basic',
      price: 499,
      period: '/month',
      description: 'Perfect for startups',
      features: [
        'Leads Management',
        'Sales Funnel Tracking',
        'WhatsApp Messaging',
        'Telegram Integration',
        'Email (1000/month)',
        'QR Code Generation',
        'Broadcast Templates',
        'Basic Reports',
      ],
      isActive: true,
      trialDays: 15,
    },
    {
      name: 'Professional',
      price: 999,
      period: '/month',
      description: 'For growing businesses',
      features: [
        'Everything in Basic',
        'AI Chatbots',
        'Advanced Automation',
        'Email (5000/month)',
        'Advanced Analytics',
        'Team Collaboration',
        'Priority Support',
        'Custom Integrations',
      ],
      isActive: false,
    },
    {
      name: 'Enterprise',
      price: 2999,
      period: '/month',
      description: 'Large scale operations',
      features: [
        'Everything in Professional',
        'AI Voice Calls',
        'Unlimited Email',
        'Advanced API Access',
        'Dedicated Manager',
        'Custom Solutions',
        'SLA Guarantee',
        'Training & Onboarding',
      ],
      isActive: false,
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
        <div className="mb-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Current Plan: Basic</h2>
          <p className="text-gray-600 mb-4">₹499/month • 15 days free trial remaining</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
            Manage Subscription
          </button>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border-2 p-6 transition-all ${
                plan.isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              {plan.isActive && (
                <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3">
                  CURRENT PLAN
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
                  plan.isActive
                    ? 'bg-gray-200 text-gray-600 cursor-default'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={plan.isActive}
              >
                {plan.isActive ? 'Current Plan' : 'Upgrade'}
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
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm mb-2">Storage Used</p>
            <p className="text-3xl font-bold text-gray-900">2.5 GB</p>
            <p className="text-xs text-gray-600 mt-2">of 5 GB included</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm mb-2">Storage Cost</p>
            <p className="text-3xl font-bold text-green-600">₹0/mo</p>
            <p className="text-xs text-gray-600 mt-2">₹50/GB for extra storage</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm mb-2">Next Billing</p>
            <p className="text-3xl font-bold text-blue-600">May 26</p>
            <p className="text-xs text-gray-600 mt-2">2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}
