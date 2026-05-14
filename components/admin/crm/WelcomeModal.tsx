'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { X, Sparkles, ArrowRight, CheckCircle, CreditCard, Loader2 } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onProceedToPayment: () => void;
}

export default function WelcomeModal({ 
  isOpen, 
  onClose, 
  userName = 'there',
  onProceedToPayment 
}: WelcomeModalProps) {
  const [step, setStep] = useState<'welcome' | 'payment'>('welcome');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-r from-swar-primary to-emerald-500 px-6 py-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Welcome, {userName}! 🎉
          </h1>
          <p className="text-white/90 text-sm">
            You&apos;re now on our <span className="font-semibold bg-white/20 px-2 py-0.5 rounded">Free Plan</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'welcome' ? (
            <>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Full CRM Access</p>
                    <p className="text-sm text-gray-500">Manage unlimited leads & contacts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">WhatsApp Integration</p>
                    <p className="text-sm text-gray-500">Send messages via Meta Business API</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Analytics Dashboard</p>
                    <p className="text-sm text-gray-500">Track leads, conversions & revenue</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                  <p className="font-semibold text-amber-800">Storage Required: ₹30 for 500MB</p>
                </div>
                <p className="text-sm text-amber-700">
                  To use all features and pages of the CRM, you need to purchase minimum 500MB storage for just ₹30.
                </p>
              </div>

              <button
                onClick={() => setStep('payment')}
                className="w-full bg-gradient-to-r from-swar-primary to-emerald-500 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                Buy Storage & Continue
                <ArrowRight className="h-5 w-5" />
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                You can explore the dashboard, but features will be locked until payment
              </p>
            </>
          ) : (
            <SetupPaymentStep onProceed={onProceedToPayment} />
          )}
        </div>
      </div>

      {/* Cashfree SDK */}
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="lazyOnload"
      />
    </div>
  );
}

function SetupPaymentStep({ onProceed }: { onProceed: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get user info from localStorage
      const userStr = localStorage.getItem('admin_user');
      const user = userStr ? JSON.parse(userStr) : {};
      
      const res = await fetch('/api/crm-site/setup-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({
          email: user.email || '',
          name: user.name || user.userId || 'User',
          phone: user.phone || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      // Redirect to Cashfree payment page or use SDK
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
          mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        });
        await cashfree.checkout({
          paymentSessionId: data.sessionId,
          redirectTarget: '_self',
        });
      } else if (data.success && data.testMode) {
        // Test mode - payment auto-completed
        onProceed();
      } else {
        throw new Error('Cashfree SDK not loaded. Please refresh and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-swar-primary/10 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CreditCard className="h-10 w-10 text-swar-primary" />
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">Purchase Storage</h3>
      <p className="text-gray-500 text-sm mb-6">
        Buy 500MB storage for ₹30 to unlock all CRM features
      </p>

      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">500MB Cloud Storage</span>
          <span className="font-semibold text-gray-900">₹30.00</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">All features unlocked</span>
          <span className="text-green-600">Included</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-gradient-to-r from-swar-primary to-emerald-500 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay ₹30 & Get Storage
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        Secure payment via Cashfree • 100% refundable within 7 days
      </p>
    </div>
  );
}
