'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Script from 'next/script';
import {
  X,
  Server,
  CreditCard,
  CheckCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface StoragePlan {
  id: string;
  name: string;
  storage: string;
  storageMB: number;
  price: number;
  features: string[];
  popular?: boolean;
}

const STORAGE_PLANS: StoragePlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    storage: '500 MB',
    storageMB: 500,
    price: 30,
    features: [
      '500MB cloud storage',
      'Basic lead management',
      'WhatsApp messaging',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    storage: '2 GB',
    storageMB: 2048,
    price: 99,
    popular: true,
    features: [
      '2GB cloud storage',
      'Advanced lead tracking',
      'WhatsApp broadcasts',
      'Analytics dashboard',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    storage: '10 GB',
    storageMB: 10240,
    price: 349,
    features: [
      '10GB cloud storage',
      'Unlimited leads',
      'All WhatsApp features',
      'Advanced analytics',
      'AI-powered insights',
      'Dedicated support',
    ],
  },
];

interface StoragePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  currentStorageMB?: number;
  onPaymentSuccess?: () => void;
}

/**
 * StoragePurchaseModal - Modal for purchasing storage plans
 */
export default function StoragePurchaseModal({
  isOpen,
  onClose,
  currentPlan = '',
  currentStorageMB = 0,
  onPaymentSuccess,
}: StoragePurchaseModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<StoragePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashfreeReady, setCashfreeReady] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('crm_token');
      const response = await fetch('/api/crm-site/setup-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          amount: selectedPlan.price,
          storageMB: selectedPlan.storageMB,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      // If payment link is returned, redirect to it
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else if (data.sessionId && window.Cashfree?.PG) {
        // Use Cashfree SDK checkout (v3 API)
        const checkout = window.Cashfree.PG.checkout({
          paymentSessionId: data.sessionId,
        });
        checkout.redirect();
      } else if (data.sessionId && typeof window.Cashfree === 'function') {
        // Use Cashfree SDK checkout (newer function-based API)
        const cashfree = window.Cashfree({
          mode: 'production',
        });
        await cashfree.checkout({
          paymentSessionId: data.sessionId,
          redirectTarget: '_self',
        });
      } else if (data.success) {
        // Payment completed (test mode)
        onPaymentSuccess?.();
        onClose();
      } else {
        throw new Error('Cashfree SDK not loaded. Please refresh and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white sticky top-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="h-8 w-8" />
                <div>
                  <h2 className="text-xl font-bold">Choose Your Storage Plan</h2>
                  <p className="text-indigo-100 text-sm">Secure cloud storage for your business data</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STORAGE_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id
                      ? 'border-indigo-600 bg-indigo-50 shadow-lg'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow'
                  } ${
                    currentPlan === plan.id ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Popular
                      </span>
                    </div>
                  )}

                  {currentPlan === plan.id && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <div className="text-3xl font-bold text-gray-900 mt-2">
                      ₹{plan.price}
                      <span className="text-sm font-normal text-gray-500">/one-time</span>
                    </div>
                    <div className="text-indigo-600 font-medium mt-1">{plan.storage}</div>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {selectedPlan?.id === plan.id && (
                    <div className="absolute inset-0 border-2 border-indigo-600 rounded-xl pointer-events-none">
                      <div className="absolute top-2 left-2">
                        <CheckCircle className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Current Usage */}
            {currentStorageMB > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Current Storage Usage</span>
                  <span className="text-sm font-medium">
                    {(currentStorageMB / 1024).toFixed(2)} GB used
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min((currentStorageMB / (selectedPlan?.storageMB || currentStorageMB)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Purchase Button */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={!selectedPlan || loading || currentPlan === selectedPlan?.id}
                className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                  selectedPlan && !loading && currentPlan !== selectedPlan?.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-200'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : selectedPlan ? (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Pay ₹{selectedPlan.price}
                  </>
                ) : (
                  'Select a Plan'
                )}
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              Secure payment via Cashfree. All plans include lifetime access.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Cashfree SDK */}
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setCashfreeReady(true)}
        strategy="lazyOnload"
      />
    </AnimatePresence>
  );
}
