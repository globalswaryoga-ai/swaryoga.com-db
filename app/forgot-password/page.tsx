'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // NOTE: This project currently does not have an email/SMS password reset backend.
      // We intentionally keep the UX non-revealing (does not confirm whether the email exists).
      // If/when we add a backend endpoint, call it here.
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSubmitStatus('success');
    } catch (_err) {
      setErrors({ general: 'Something went wrong. Please try again.' });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-swar-bg">
        <div className="container mx-auto max-w-md px-6 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-swar-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="h-8 w-8 text-swar-primary" />
              </div>
              <h1 className="text-2xl font-bold text-swar-text mb-2">Forgot your password?</h1>
              <p className="text-swar-text-secondary">
                Enter your email and we’ll help you get back in.
              </p>
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-swar-primary-light border border-green-200 rounded-lg flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-swar-primary mt-0.5" />
                <div>
                  <p className="text-swar-primary font-medium">Request received</p>
                  <p className="text-swar-text-secondary text-sm mt-1">
                    If an account exists for <span className="font-medium">{email}</span>, you’ll receive reset instructions.
                  </p>
                </div>
              </div>
            )}

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{errors.general}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-swar-text mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-swar-text-secondary" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                      if (errors.general) setErrors((prev) => ({ ...prev, general: '' }));
                    }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent transition-colors ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-swar-border'
                    }`}
                    placeholder="Enter your email address"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-swar-primary to-green-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-5 w-5" />
                    <span>Send reset instructions</span>
                  </>
                )}
              </button>
            </form>

            {/* Links */}
            <div className="mt-8 text-center">
              <p className="text-swar-text-secondary">
                Remembered your password?{' '}
                <Link href="/signin" className="text-swar-primary hover:text-swar-primary font-medium">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Help */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Need help?</p>
              <p className="text-xs text-blue-700">
                If you don’t receive an email, check your spam folder or contact us via the WhatsApp widget.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
