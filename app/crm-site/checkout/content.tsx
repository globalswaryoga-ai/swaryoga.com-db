'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  Smartphone,
  Building,
  Shield,
  Lock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  HardDrive,
  Plus,
  Minus,
} from 'lucide-react';

const STORAGE_PRICING: Record<string, { minStorageMB: number; pricePerGB: number; minPrice: number }> = {
  free: { minStorageMB: 500, pricePerGB: 60, minPrice: 30 },
  basic: { minStorageMB: 1000, pricePerGB: 50, minPrice: 50 },
  starter: { minStorageMB: 1000, pricePerGB: 35, minPrice: 35 },
  growth: { minStorageMB: 1000, pricePerGB: 35, minPrice: 35 },
  professional: { minStorageMB: 1000, pricePerGB: 35, minPrice: 35 },
};

const PLAN_PRICING: Record<string, { monthly: number; quarterly: number; annual: number; name: string }> = {
  free: { monthly: 0, quarterly: 0, annual: 0, name: 'Free Plan' },
  basic: { monthly: 999, quarterly: 2997, annual: 9990, name: 'Basic Plan' },
  starter: { monthly: 1999, quarterly: 5997, annual: 19990, name: 'Starter Plan' },
  growth: { monthly: 4999, quarterly: 14997, annual: 49990, name: 'Growth Plan' },
  professional: { monthly: 9999, quarterly: 29997, annual: 99990, name: 'Professional Plan' },
};

const PAYMENT_METHODS = [
  {
    id: 'upi',
    name: 'UPI',
    description: 'PhonePe, Google Pay, Paytm, BHIM',
    icon: Smartphone,
    supportsAutopay: true,
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, Rupay',
    icon: CreditCard,
    supportsAutopay: true,
  },
  {
    id: 'netbanking',
    name: 'Net Banking',
    description: 'All major banks',
    icon: Building,
    supportsAutopay: false,
  },
];

export default function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [plan, setPlan] = useState(searchParams.get('plan') || 'starter');
  const [billing, setBilling] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [storageGB, setStorageGB] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [enableAutopay, setEnableAutopay] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  // Form fields
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    gstNumber: '',
    billingAddress: '',
  });

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem('admin_user');
      if (userData) {
        const user = JSON.parse(userData);
        setForm(prev => ({
          ...prev,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          businessName: user.businessName || '',
        }));
      }
    } catch {}
  }, []);

  // Calculate costs
  const planPricing = PLAN_PRICING[plan] || PLAN_PRICING.starter;
  const storagePricing = STORAGE_PRICING[plan] || STORAGE_PRICING.starter;
  
  const planCost = billing === 'annual' 
    ? planPricing.annual 
    : billing === 'quarterly' 
      ? planPricing.quarterly 
      : planPricing.monthly;
      
  const storageCost = Math.max(storageGB * storagePricing.pricePerGB, storagePricing.minPrice);
  const subtotal = planCost + storageCost;
  const gst = Math.ceil(subtotal * 0.18);
  const total = subtotal + gst;

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone) {
      setError('Please fill in all required fields');
      return;
    }

    if (paymentMethod === 'upi' && enableAutopay && !upiId) {
      setError('Please enter your UPI ID for auto-pay');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/crm-site/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billing,
          storageGB,
          paymentMethod,
          enableAutopay,
          upiId: paymentMethod === 'upi' ? upiId : undefined,
          ...form,
          tenantSlug: JSON.parse(localStorage.getItem('admin_user') || '{}')?.tenantSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      if (data.paymentSessionId) {
        // Load Cashfree SDK
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => {
          const cashfree = (window as any).Cashfree({ mode: 'production' });
          cashfree.checkout({
            paymentSessionId: data.paymentSessionId,
            redirectTarget: '_self',
            paymentMethod: paymentMethod === 'upi' ? 'upi' : paymentMethod === 'card' ? 'card' : undefined,
          });
        };
        document.body.appendChild(script);
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/crm-site/pricing" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Order</h1>
            <p className="text-sm text-gray-500">Secure checkout powered by Cashfree</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">1. Select Plan</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Object.entries(PLAN_PRICING).map(([id, p]) => (
                  <button
                    key={id}
                    onClick={() => setPlan(id)}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      plan === id
                        ? 'border-swar-primary bg-swar-primary/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">{p.name.replace(' Plan', '')}</div>
                    <div className="text-xs text-gray-500">₹{p.monthly}/mo</div>
                  </button>
                ))}
              </div>

              {/* Billing Cycle */}
              <div className="mt-4 flex gap-2">
                {(['monthly', 'quarterly', 'annual'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBilling(b)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                      billing === b
                        ? 'bg-swar-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {b === 'monthly' ? 'Monthly' : b === 'quarterly' ? 'Quarterly' : 'Annual (Save 17%)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Storage Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-swar-primary" />
                2. Storage (Required)
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {plan === 'free' 
                  ? 'Minimum 500MB required — ₹30/500MB' 
                  : plan === 'basic'
                    ? 'Minimum 1GB required — ₹50/GB'
                    : 'Minimum 1GB required — ₹35/GB per month'}
              </p>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStorageGB(Math.max(1, storageGB - 1))}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                  disabled={storageGB <= 1}
                >
                  <Minus className="h-5 w-5" />
                </button>
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-gray-900">{storageGB} GB</div>
                  <div className="text-sm text-gray-500">₹{storageCost}/month</div>
                </div>
                <button
                  onClick={() => setStorageGB(storageGB + 1)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">3. Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                      paymentMethod === method.id
                        ? 'border-swar-primary bg-swar-primary/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4 text-swar-primary"
                    />
                    <method.icon className="h-6 w-6 text-gray-600" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{method.name}</div>
                      <div className="text-xs text-gray-500">{method.description}</div>
                    </div>
                    {method.supportsAutopay && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Auto-pay
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* UPI ID for auto-pay */}
              {paymentMethod === 'upi' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UPI ID (for auto-pay)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@paytm / yourphone@ybl"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Works with PhonePe, Google Pay, Paytm, BHIM, and all UPI apps
                    </p>
                  </div>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableAutopay}
                      onChange={(e) => setEnableAutopay(e.target.checked)}
                      className="w-4 h-4 text-swar-primary rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Enable auto-pay for hassle-free renewals
                    </span>
                  </label>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700">
                    <Shield className="h-4 w-4 inline mr-1" />
                    Your card details will be securely saved for auto-renewals. You can cancel anytime.
                  </p>
                </div>
              )}
            </div>

            {/* Billing Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">4. Billing Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Number (Optional)</label>
                  <input
                    type="text"
                    value={form.gstNumber}
                    onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                  <input
                    type="text"
                    value={form.billingAddress}
                    onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-4">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{planPricing.name}</span>
                  <span className="font-medium">₹{planCost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage ({storageGB} GB)</span>
                  <span className="font-medium">₹{storageCost}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>GST (18%)</span>
                  <span>₹{gst}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-swar-primary">₹{total}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {billing === 'monthly' 
                    ? 'Billed monthly' 
                    : billing === 'quarterly' 
                      ? 'Billed every 3 months' 
                      : 'Billed annually'}
                </p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === 'loading'}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow transition disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Pay ₹{total}
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Lock className="h-3 w-3" />
                <span>256-bit SSL Encrypted</span>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 text-center">
                  Confirmation email will be sent to<br />
                  <strong>mohan@swaryoga.com</strong> & your email
                </p>
              </div>

              {/* Trust badges */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <img src="https://cashfreelogo.cashfree.com/website/landings/instant-settlements/702702.svg" alt="Cashfree" className="h-6 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
