'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
} from 'lucide-react';

/* ─── Auto-detect India by timezone ─── */
function detectIsIndia(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta';
  } catch {
    return false;
  }
}

/* ─── Types ─── */
interface SignupForm {
  // Step 1 — Account
  businessName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // Step 2 — Plan
  plan: string;
}

interface FieldError {
  field: string;
  message: string;
}

interface QuickPlan { id: string; name: string; priceINR: string; priceUSD: string; desc: string; highlight: boolean; }

/* Fallback (used only if the live plans API is unreachable) */
const FALLBACK_PLANS_QUICK: QuickPlan[] = [
  { id: 'free', name: 'Free', priceINR: '₹0/mo', priceUSD: '$0/mo', desc: '100 leads', highlight: false },
  { id: 'basic', name: 'Basic', priceINR: '₹999/mo', priceUSD: '$12/mo', desc: '2,000 leads', highlight: false },
  { id: 'starter', name: 'Copper', priceINR: '₹1,999/mo', priceUSD: '$25/mo', desc: '5,000 leads', highlight: false },
  { id: 'growth', name: 'Silver', priceINR: '₹4,999/mo', priceUSD: '$59/mo', desc: '25,000 leads', highlight: true },
  { id: 'professional', name: 'Golden', priceINR: '₹9,999/mo', priceUSD: '$119/mo', desc: 'Unlimited leads', highlight: false },
];

/* Map admin-edited tenant plans → signup quick-pick cards */
function mapQuickPlans(dbPlans: any[]): QuickPlan[] {
  const sorted = [...dbPlans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.monthlyPriceINR ?? 0) - (b.monthlyPriceINR ?? 0));
  const cards = sorted.map((p): QuickPlan => {
    const m = Number(p.monthlyPriceINR) || 0;
    const usd = m === 0 ? 0 : Math.round(m / 83);
    const leadsN = Number(p?.limits?.maxLeads) || 0;
    const leads = leadsN >= 999999 ? 'Unlimited' : leadsN.toLocaleString('en-IN');
    return {
      id: p.tier,
      name: p.name,
      priceINR: m === 0 ? '₹0/mo' : `₹${m.toLocaleString('en-IN')}/mo`,
      priceUSD: usd === 0 ? '$0/mo' : `$${usd}/mo`,
      desc: `${leads} leads${p.trialDays ? ` · ${p.trialDays}-day trial` : ''}${p.discountPercent ? ` · ${p.discountPercent}% off` : ''}`,
      highlight: false,
    };
  });
  if (cards.length >= 3) cards[Math.floor(cards.length / 2)].highlight = true;
  return cards;
}

export default function CrmSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SignupForm>({
    businessName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    plan: 'free',
  });
  const [showPw, setShowPw] = useState(false);
  const [isINR, setIsINR] = useState(true);
  const [quickPlans, setQuickPlans] = useState<QuickPlan[]>(FALLBACK_PLANS_QUICK);
  const [errors, setErrors] = useState<FieldError[]>([]);

  useEffect(() => { setIsINR(detectIsIndia()); }, []);

  // Pull live, admin-edited plans (same source as Tenant Management).
  useEffect(() => {
    fetch('/api/admin/tenants/plans')
      .then((r) => r.json())
      .then((d) => {
        const dbPlans = d?.data?.plans || [];
        if (Array.isArray(dbPlans) && dbPlans.length) setQuickPlans(mapQuickPlans(dbPlans));
      })
      .catch(() => {});
  }, []);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState('');

  /* helpers */
  const fieldError = (field: string) => errors.find((e) => e.field === field)?.message;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors(errors.filter((er) => er.field !== e.target.name));
    if (status === 'error') { setStatus('idle'); setApiError(''); }
  };

  /* Validation per step */
  const validateStep = (): boolean => {
    const errs: FieldError[] = [];

    if (step === 1) {
      if (!form.businessName.trim()) errs.push({ field: 'businessName', message: 'Business name is required' });
      if (!form.fullName.trim()) errs.push({ field: 'fullName', message: 'Your name is required' });
      if (!form.email.trim()) errs.push({ field: 'email', message: 'Email is required' });
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push({ field: 'email', message: 'Enter a valid email' });
      if (!form.phone.trim()) errs.push({ field: 'phone', message: 'Phone is required' });
      if (form.password.length < 6) errs.push({ field: 'password', message: 'Password must be at least 6 characters' });
      if (form.password !== form.confirmPassword) errs.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    // Step 2 is optional — no validation (can skip)
    // Step 3 — plan selection always valid (defaults to free)

    setErrors(errs);
    return errs.length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  /* Submit */
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setStatus('loading');
    setApiError('');

    try {
      const res = await fetch('/api/crm-site/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      let data: any;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (!res.ok) {
        // Show field-level errors if the API returns them
        if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
          setErrors(data.fieldErrors);
          // If errors are on step 1 fields, go back
          const step1Fields = ['businessName', 'fullName', 'email', 'phone', 'password'];
          if (data.fieldErrors.some((e: FieldError) => step1Fields.includes(e.field))) {
            setStep(1);
          }
        }
        throw new Error(data.error || 'Signup failed. Please try again.');
      }

      setStatus('success');

      // Store auth token if returned
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('adminUser', data.userId || form.email);
        if (data.user) {
          localStorage.setItem('admin_user', JSON.stringify(data.user));
        }
      }

      // For paid plans, redirect to checkout page for storage & payment options
      if (form.plan !== 'free' && data.user?.tenantSlug) {
        const checkoutUrl = `/crm-site/checkout?plan=${form.plan}`;
        setTimeout(() => router.push(checkoutUrl), 1500);
        return;
      }

      // Free plan - go directly to QR-first CRM experience
      setTimeout(() => router.push('/admin/crm/qr'), 1500);
    } catch (err: any) {
      setStatus('error');
      setApiError(err.message || 'Something went wrong.');
    }
  };

  /* Step UI */
  const stepNames = ['Account', 'Choose Plan'];

  return (
    <section className="py-16">
      <div className="max-w-xl mx-auto px-4">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepNames.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    step > i + 1
                      ? 'bg-swar-primary text-white'
                      : step === i + 1
                      ? 'bg-swar-primary text-white ring-4 ring-swar-primary/20'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s}
                </span>
              </div>
              {i < stepNames.length - 1 && <div className={`w-8 h-0.5 ${step > i + 1 ? 'bg-swar-primary' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Success state */}
          {status === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-swar-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
              <p className="text-gray-600 text-sm mb-2">
                Your CRM is ready. Explore all features and connect services from Settings when you&apos;re ready.
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-swar-primary mx-auto mt-4" />
            </div>
          ) : (
            <>
              {/* Error popup */}
              {apiError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-700 text-sm">Signup Error</p>
                      <p className="text-red-600 text-sm mt-1">{apiError}</p>
                    </div>
                    <button onClick={() => setApiError('')} className="text-red-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 1: Account Details ─── */}
              {step === 1 && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-swar-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <UserPlus className="h-7 w-7 text-swar-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Create Your Account</h2>
                    <p className="text-sm text-gray-500 mt-1">Set up your CRM in under 2 minutes</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                      <input
                        name="businessName"
                        value={form.businessName}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition ${
                          fieldError('businessName') ? 'border-red-400 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder="e.g. Sunrise Yoga Studio"
                      />
                      {fieldError('businessName') && <p className="text-xs text-red-600 mt-1">{fieldError('businessName')}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name *</label>
                      <input
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition ${
                          fieldError('fullName') ? 'border-red-400 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder="Your name"
                      />
                      {fieldError('fullName') && <p className="text-xs text-red-600 mt-1">{fieldError('fullName')}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition ${
                            fieldError('email') ? 'border-red-400 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="you@company.com"
                        />
                        {fieldError('email') && <p className="text-xs text-red-600 mt-1">{fieldError('email')}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <input
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition ${
                            fieldError('phone') ? 'border-red-400 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="+91 98765 43210"
                        />
                        {fieldError('phone') && <p className="text-xs text-red-600 mt-1">{fieldError('phone')}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPw ? 'text' : 'password'}
                          value={form.password}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition pr-10 ${
                            fieldError('password') ? 'border-red-400 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="Min 6 characters"
                          autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldError('password') && <p className="text-xs text-red-600 mt-1">{fieldError('password')}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                      <input
                        name="confirmPassword"
                        type="password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition ${
                          fieldError('confirmPassword') ? 'border-red-400 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                      />
                      {fieldError('confirmPassword') && <p className="text-xs text-red-600 mt-1">{fieldError('confirmPassword')}</p>}
                    </div>
                  </div>

                  <button
                    onClick={nextStep}
                    className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow transition-all"
                  >
                    Next: Choose Plan <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* ─── STEP 2: Choose Plan ─── */}
              {step === 2 && (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Choose Your Plan</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      15-day free trial on all plans.{' '}
                      <Link href="/crm-site/pricing" className="text-swar-primary hover:underline">
                        Compare plans in detail
                      </Link>
                    </p>
                    {!isINR && (
                      <p className="text-xs text-amber-600 mt-1">USD prices include 3% payment processing fee</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {quickPlans.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          form.plan === p.id
                            ? 'border-swar-primary bg-swar-primary/5'
                            : 'border-gray-100 hover:border-gray-200'
                        } ${p.highlight ? 'ring-1 ring-swar-primary/20' : ''}`}
                      >
                        <input
                          type="radio"
                          name="plan"
                          value={p.id}
                          checked={form.plan === p.id}
                          onChange={handleChange}
                          className="w-4 h-4 text-swar-primary focus:ring-swar-primary border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                            {p.highlight && (
                              <span className="px-2 py-0.5 bg-swar-primary text-white text-[10px] font-bold rounded-full">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{isINR ? p.priceINR : p.priceUSD}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={prevStep}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={status === 'loading'}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow transition-all disabled:opacity-50"
                    >
                      {status === 'loading' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                        </>
                      ) : (
                        <>
                          Create Account <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs text-blue-700 text-center leading-relaxed">
                      Every feature unlocked on every plan — WhatsApp, AI Voice, Payments, Community &amp; more. You only choose your lead limit. Storage billed separately per use.
                    </p>
                  </div>

                  {form.plan !== 'free' && (
                    <p className="text-xs text-gray-400 text-center mt-3">
                      You&apos;ll be taken to Cashfree checkout after account creation for paid plans.
                    </p>
                  )}
                </>
              )}

              {/* Login link */}
              <div className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/crm-site/login" className="font-semibold text-swar-primary hover:underline">
                  Log in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
