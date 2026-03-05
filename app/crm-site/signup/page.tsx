'use client';

import React, { useState } from 'react';
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
  Info,
  X,
} from 'lucide-react';

/* ─── Types ─── */
interface SignupForm {
  // Step 1 — Account
  businessName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // Step 2 — Configuration (auto-connect)
  whatsappPhoneId: string;
  whatsappAccessToken: string;
  cashfreeClientId: string;
  cashfreeClientSecret: string;
  retellApiKey: string;
  // Step 3 — Plan
  plan: string;
}

interface FieldError {
  field: string;
  message: string;
}

const PLANS_QUICK = [
  { id: 'free', name: 'Free', price: '₹0/mo', desc: '250 leads, 1 user', highlight: false },
  { id: 'starter', name: 'Starter', price: '₹1,999/mo', desc: '5K leads, WhatsApp', highlight: false },
  { id: 'growth', name: 'Growth', price: '₹4,999/mo', desc: '25K leads, AI + Payments', highlight: true },
  { id: 'professional', name: 'Professional', price: '₹9,999/mo', desc: '50K leads, Full suite', highlight: false },
  { id: 'enterprise', name: 'Enterprise', price: '₹24,999/mo', desc: '100K leads, API access', highlight: false },
];

const GUIDE_TEXT: Record<string, string> = {
  whatsappPhoneId:
    'Go to Meta Business Suite → WhatsApp → API Setup → Copy your Phone Number ID. This connects your WhatsApp Business number to the CRM.',
  whatsappAccessToken:
    'In Meta Business Suite → WhatsApp → API Setup → Generate a permanent access token. This authorizes the CRM to send/receive messages on your behalf.',
  cashfreeClientId:
    'Log in to Cashfree Dashboard → Developers → API Keys → Copy your App ID (Client ID). Use sandbox keys for testing.',
  cashfreeClientSecret:
    'In the same Cashfree API Keys page, copy the Secret Key. Keep this secure — it authorizes payment creation.',
  retellApiKey:
    'Go to retellai.com → Dashboard → Settings → API Keys → Copy your key. This enables AI voice calling in 19 languages.',
};

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
    whatsappPhoneId: '',
    whatsappAccessToken: '',
    cashfreeClientId: '',
    cashfreeClientSecret: '',
    retellApiKey: '',
    plan: 'free',
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState('');
  const [guideField, setGuideField] = useState<string | null>(null);

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

      const data = await res.json();

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

      setTimeout(() => router.push('/admin/crm'), 1500);
    } catch (err: any) {
      setStatus('error');
      setApiError(err.message || 'Something went wrong.');
    }
  };

  /* Step UI */
  const stepNames = ['Account', 'Connect', 'Plan'];

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
              {i < 2 && <div className={`w-8 h-0.5 ${step > i + 1 ? 'bg-swar-primary' : 'bg-gray-200'}`} />}
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
                Your CRM is being configured. Redirecting to your dashboard...
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
                    <div className="grid grid-cols-2 gap-4">
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
                    Next: Connect Services <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* ─── STEP 2: Auto-Connect Services ─── */}
              {step === 2 && (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Connect Your Services</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Optional — add these now or later from Settings. Click the <Info className="inline h-3.5 w-3.5 text-swar-primary" /> icon for setup guides.
                    </p>
                  </div>

                  {/* Guide Popup */}
                  {guideField && GUIDE_TEXT[guideField] && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl relative">
                      <button onClick={() => setGuideField(null)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600">
                        <X className="h-4 w-4" />
                      </button>
                      <p className="text-sm text-blue-800 leading-relaxed pr-6">
                        <strong className="block mb-1">How to find this:</strong>
                        {GUIDE_TEXT[guideField]}
                      </p>
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* WhatsApp */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                        WhatsApp Business API
                        <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">Phone Number ID</label>
                            <button onClick={() => setGuideField('whatsappPhoneId')} className="text-swar-primary hover:text-swar-primary-hover">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            name="whatsappPhoneId"
                            value={form.whatsappPhoneId}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                            placeholder="e.g. 123456789012345"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">Access Token</label>
                            <button onClick={() => setGuideField('whatsappAccessToken')} className="text-swar-primary hover:text-swar-primary-hover">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            name="whatsappAccessToken"
                            type="password"
                            value={form.whatsappAccessToken}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                            placeholder="Paste your token"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cashfree */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                        Cashfree Payments
                        <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">Client ID (App ID)</label>
                            <button onClick={() => setGuideField('cashfreeClientId')} className="text-swar-primary hover:text-swar-primary-hover">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            name="cashfreeClientId"
                            value={form.cashfreeClientId}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                            placeholder="e.g. 12345abc"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">Client Secret</label>
                            <button onClick={() => setGuideField('cashfreeClientSecret')} className="text-swar-primary hover:text-swar-primary-hover">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            name="cashfreeClientSecret"
                            type="password"
                            value={form.cashfreeClientSecret}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                            placeholder="Paste your secret key"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Retell AI */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                        Retell AI (Voice Calls)
                        <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                      </h4>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-600">API Key</label>
                          <button onClick={() => setGuideField('retellApiKey')} className="text-swar-primary hover:text-swar-primary-hover">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          name="retellApiKey"
                          type="password"
                          value={form.retellApiKey}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                          placeholder="Paste your Retell API key"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={prevStep}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                      onClick={nextStep}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow transition-all"
                    >
                      Next: Choose Plan <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 text-center mt-3">
                    You can skip this step and configure services later from Settings.
                  </p>
                </>
              )}

              {/* ─── STEP 3: Choose Plan ─── */}
              {step === 3 && (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Choose Your Plan</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Start free and upgrade anytime.{' '}
                      <Link href="/crm-site/pricing" className="text-swar-primary hover:underline">
                        Compare plans in detail
                      </Link>
                    </p>
                  </div>

                  <div className="space-y-3">
                    {PLANS_QUICK.map((p) => (
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
                        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{p.price}</span>
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
