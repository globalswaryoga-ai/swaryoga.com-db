'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

function setPlannerSession(email: string) {
  // Client-side session storage
  localStorage.setItem('lifePlannerUser', JSON.stringify({ email, createdAt: Date.now() }));
}

export default function LifePlannerSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if already logged in, redirect to dashboard
  useEffect(() => {
    const userSession = localStorage.getItem('lifePlannerUser');
    if (userSession) {
      // User is already logged in, redirect to dashboard
      router.push('/life-planner/dashboard');
    } else {
      setMounted(true);
    }
  }, [router]);

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      email.trim().length > 3 &&
      password.trim().length > 5 &&
      password === confirmPassword,
    [name, email, password, confirmPassword]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      // Validate passwords match
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setIsLoading(false);
        return;
      }

      try {
        // Call signup API to create account
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Signup failed. Please try again.');
          setIsLoading(false);
          return;
        }

        // Success - set session and redirect
        setPlannerSession(email.trim());
        router.push('/life-planner/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during signup.');
        setIsLoading(false);
      }
    },
    [name, email, password, confirmPassword, router]
  );

  // If not mounted and checking session, show loading
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-swar-text-secondary">Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-pink-50 text-swar-text">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto grid gap-10 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.5em] text-red-600">Life Planner</p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-swar-text">
                Create your account—
                <span className="block text-red-500">start your transformation journey.</span>
              </h1>
              <p className="text-swar-text leading-relaxed">
                Join thousands of users organizing their visions, goals, and daily routines with our comprehensive Life
                Planner. Track your progress and celebrate your achievements.
              </p>
            </div>

            <div className="bg-white border border-swar-border rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-2xl bg-swar-primary-light flex items-center justify-center text-xl">✨</div>
                <div>
                  <h2 className="text-2xl font-semibold text-swar-text">Sign Up</h2>
                  <p className="text-sm text-swar-text-secondary">Create your Life Planner account</p>
                </div>
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-swar-primary">
                  {error}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm text-swar-text">Full Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    className="mt-2 w-full rounded-2xl bg-white border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-swar-text">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="mt-2 w-full rounded-2xl bg-white border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-swar-text">Password</span>
                  <div className="relative mt-2">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-2xl bg-white border border-swar-border px-4 py-3 pr-12 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-swar-text-secondary hover:text-swar-text transition"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm text-swar-text">Confirm Password</span>
                  <div className="relative mt-2">
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="w-full rounded-2xl bg-white border border-swar-border px-4 py-3 pr-12 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-swar-text-secondary hover:text-swar-text transition"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={!canSubmit || isLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-swar-accent to-swar-accent px-5 py-3 font-semibold text-white shadow-lg hover:from-red-600 hover:to-pink-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating account...' : 'Create account →'}
                </button>
              </form>

              <div className="mt-6 space-y-3 border-t border-swar-border pt-6">
                <p className="text-center text-sm text-swar-text-secondary">
                  Already have an account?{' '}
                  <a
                    href="/life-planner/login"
                    className="font-semibold text-red-600 hover:text-swar-primary transition"
                  >
                    Log in here
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
