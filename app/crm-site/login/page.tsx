'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function CrmLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  // Check if already logged in - redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
    if (token && token !== 'null' && token !== 'undefined') {
      router.replace('/admin/crm/qr');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/crm-site/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        setStatus('success');
        // Set tokens synchronously
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('admin_token', data.token);
        const resolvedUserId = data.user?.userId || form.email;
        localStorage.setItem('adminUser', resolvedUserId);
        localStorage.setItem(
          'admin_user',
          JSON.stringify({
            ...(data.user && typeof data.user === 'object' ? data.user : {}),
            userId: resolvedUserId,
          })
        );
        // Use replace instead of push to prevent back button issues
        // Small delay to show success message
        setTimeout(() => {
          window.location.href = '/admin/crm/qr';
        }, 800);
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
        setStatus('error');
      }
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (status === 'error') { setStatus('idle'); setError(''); }
  };

  return (
    <section className="py-20">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-swar-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-7 w-7 text-swar-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-1">Log in to your Swar Yoga CRM account</p>
          </div>

          {/* Status */}
          {status === 'success' && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" /> Login successful! Redirecting...
            </div>
          )}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email or Username</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                placeholder="you@company.com"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition pr-10"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow transition-all disabled:opacity-50"
            >
              {status === 'loading' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Log In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/crm-site/signup" className="font-semibold text-swar-primary hover:underline">
              Sign up free
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
