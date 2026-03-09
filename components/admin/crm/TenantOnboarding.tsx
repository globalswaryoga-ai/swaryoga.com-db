'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  ShieldCheck,
  Server,
  CreditCard,
  CheckCircle,
  ArrowRight,
  FileText,
} from 'lucide-react';

interface OnboardingStatus {
  setupPaid: boolean;
  isFirstLogin: boolean;
  loginCount: number;
  storageUsedMB: number;
  storageLimitMB: number;
  planName: string;
}

interface TenantOnboardingProps {
  userEmail: string;
  userName: string;
  onComplete: () => void;
  onStoragePurchase: () => void;
}

/**
 * TenantOnboarding - Welcome flow for new CRM tenants
 * Shows welcome message, rules, and storage purchase requirement
 */
export default function TenantOnboarding({
  userEmail,
  userName,
  onComplete,
  onStoragePurchase,
}: TenantOnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'rules' | 'storage' | 'complete'>('welcome');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 'welcome') {
      setStep('rules');
    } else if (step === 'rules' && agreed) {
      setStep('storage');
    } else if (step === 'storage') {
      onStoragePurchase();
    }
  };

  const handleSkip = () => {
    // Mark onboarding as seen
    localStorage.setItem('crm_onboarding_seen', 'true');
    onComplete();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8" />
                <div>
                  <h2 className="text-xl font-bold">Welcome to Swar Yoga CRM</h2>
                  <p className="text-indigo-100 text-sm">Your business assistant awaits</p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between mb-6">
              {['welcome', 'rules', 'storage'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        step === s
                          ? 'bg-indigo-600 text-white'
                          : ['welcome', 'rules', 'storage'].indexOf(step) > i
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {['welcome', 'rules', 'storage'].indexOf(step) > i ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="text-xs mt-1 text-gray-500 capitalize">{s}</span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      ['welcome', 'rules', 'storage'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {step === 'welcome' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto flex items-center justify-center mb-4">
                    <span className="text-4xl">🙏</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Namaste, {userName || 'Friend'}!
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Thank you for choosing Swar Yoga CRM. Let&apos;s get you started with managing your leads, 
                    messages, and business communications efficiently.
                  </p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl space-y-3">
                  <h4 className="font-medium text-indigo-900">What you can do:</h4>
                  <ul className="space-y-2 text-sm text-indigo-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Manage leads and customer data
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Send WhatsApp messages and broadcasts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Track follow-ups and conversations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Generate reports and analytics
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {step === 'rules' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
                    <p className="text-sm text-gray-500">Please read and accept to continue</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto text-sm space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">1. Data Storage</h4>
                    <p className="text-gray-600">
                      Your data is stored securely in our cloud infrastructure. Initial storage 
                      limit is 500MB which can be upgraded by purchasing additional storage plans.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">2. Usage Policy</h4>
                    <p className="text-gray-600">
                      The CRM should be used for legitimate business purposes only. Spam or 
                      unauthorized messaging is strictly prohibited.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">3. Privacy</h4>
                    <p className="text-gray-600">
                      Customer data you store is your responsibility. We do not share your 
                      data with third parties without consent.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">4. Storage Purchase</h4>
                    <p className="text-gray-600">
                      To use all features and pages of the CRM, you need to purchase minimum 500MB 
                      cloud storage for just ₹30. You can upgrade to larger plans anytime.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">5. Support</h4>
                    <p className="text-gray-600">
                      Email support is available for all users. Priority support is available 
                      for premium plan users.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 bg-white border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the Terms & Conditions
                  </span>
                </label>

                <button
                  onClick={handleNext}
                  disabled={!agreed}
                  className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                    agreed
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Accept & Continue <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {step === 'storage' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Server className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Activate Your Storage</h3>
                    <p className="text-sm text-gray-500">One-time setup to get started</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
                      <CreditCard className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-1">
                      ₹30<span className="text-lg font-normal text-gray-500">/one-time</span>
                    </div>
                    <p className="text-indigo-600 font-medium">Starter Plan - 500MB Storage</p>
                  </div>

                  <div className="mt-6 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>500MB secure cloud storage</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Store leads, messages, and files</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>WhatsApp messaging integration</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Basic analytics and reports</span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-xs text-gray-500">
                  Secure payment via Cashfree. You can upgrade your plan anytime.
                </div>

                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay ₹30 & Activate <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleSkip}
                  className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
                >
                  Skip for now (limited features)
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
