'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

function setPlannerSession(email: string, token?: string) {
  // Client-side session storage
  localStorage.setItem('lifePlannerUser', JSON.stringify({ email, createdAt: Date.now() }));
  if (token) {
    localStorage.setItem('lifePlannerToken', token);
  }
}

export default function LifePlannerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if already logged in, redirect to dashboard
  useEffect(() => {
    const userSession = localStorage.getItem('lifePlannerUser');
    const token = localStorage.getItem('lifePlannerToken');

    // Prefill email if available
    if (userSession && !email) {
      try {
        const parsed = JSON.parse(userSession);
        if (parsed?.email) setEmail(parsed.email);
      } catch {
        // ignore
      }
    }

    // Only redirect if both session and token exist.
    if (userSession && token) {
      router.push('/life-planner/dashboard');
      return;
    }

    setMounted(true);
  }, [router, email]);

  const canSubmit = useMemo(() => email.trim().length > 3 && password.trim().length > 3, [email, password]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Call login API to verify credentials
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Login failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

  // Success - set session and redirect
  const data = await response.json();
  setPlannerSession(email.trim(), data?.token);
      router.push('/life-planner/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login.');
      setIsLoading(false);
    }
  }, [email, password, router]);

  // If not mounted and checking session, show loading
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-pink-50 text-gray-900">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto grid gap-10 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.5em] text-red-600">Life Planner</p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
                Build your best planner—
                <span className="block text-red-500">daily, weekly, monthly, yearly.</span>
              </h1>
              <p className="text-gray-700 leading-relaxed">
                Your life has many commitments. This planner helps you organise visions, milestones, goals, tasks, reminders,
                health routines, and the important people around you—so progress stays visible.
              </p>
            </div>

            <div className="bg-white border border-pink-200 rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-2xl bg-red-100 flex items-center justify-center text-xl">🗓️</div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Login</h2>
                  <p className="text-sm text-gray-600">Access your Life Planner dashboard</p>
                </div>
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm text-gray-700">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="mt-2 w-full rounded-2xl bg-white border border-pink-200 px-4 py-3 text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-700">Password</span>
                  <div className="relative mt-2">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-2xl bg-white border border-pink-200 px-4 py-3 pr-12 text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={!canSubmit || isLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 px-5 py-3 font-semibold text-white shadow-lg hover:from-red-600 hover:to-pink-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Enter dashboard →'}
                </button>
              </form>

              <div className="mt-6 space-y-3 border-t border-pink-200 pt-6">
                <p className="text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <a
                    href="/life-planner/signup"
                    className="font-semibold text-red-600 hover:text-red-700 transition"
                  >
                    Sign up here
                  </a>
                </p>
                <p className="text-center text-sm text-gray-600">
                  <a
                    href="/life-planner/forgot-password"
                    className="font-semibold text-gray-700 hover:text-red-600 transition"
                  >
                    Forgot password?
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
