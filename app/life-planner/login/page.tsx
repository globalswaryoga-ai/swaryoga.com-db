'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { setSession } from '@/lib/sessionManager';

export default function LifePlannerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if already logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('lifePlannerToken');
    const user = localStorage.getItem('user') || localStorage.getItem('lifePlannerUser');

    // Prefill email if available from saved credentials
    if (!email && localStorage.getItem('savedEmail')) {
      setEmail(localStorage.getItem('savedEmail') || '');
    }
    
    if (!password && localStorage.getItem('savedPassword')) {
      try {
        setPassword(atob(localStorage.getItem('savedPassword') || ''));
        setSavePassword(true);
      } catch {
        // Ignore decode errors
      }
    }

    // Redirect if already logged in
    if (token && user) {
      router.push('/life-planner/dashboard');
      return;
    }

    setMounted(true);
  }, [router, email, password]);

  const canSubmit = useMemo(() => email.trim().length > 3 && password.trim().length > 6, [email, password]);

  const handleSavePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSavePassword(e.target.checked);
  };

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      // Call login API with same credentials as signup/signin
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Database connection failed. Please try again later.');
        setIsLoading(false);
        return;
      }

      // Success - set session and save credentials if requested
      const data = await response.json();
      
      setSuccess(true);
      
      // Save credentials if user checked the "Save Password" checkbox
      if (savePassword) {
        localStorage.setItem('savedEmail', email.trim());
        localStorage.setItem('savedPassword', btoa(password)); // Base64 encode
      } else {
        // Clear saved credentials if unchecked
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('savedPassword');
      }

      // Set session with unified format
      setSession({
        token: data.token,
        user: {
          id: data.user?.id || '',
          name: data.user?.name || '',
          email: data.user?.email || email.trim(),
          phone: data.user?.phone || '',
          countryCode: data.user?.countryCode || '+91'
        }
      });

      // Also keep life-planner specific keys for backward compatibility with existing life planner code.
      try {
        localStorage.setItem('lifePlannerToken', data.token);
        localStorage.setItem(
          'lifePlannerUser',
          JSON.stringify({ email: data.user?.email || email.trim(), createdAt: Date.now() })
        );
      } catch {
        // ignore storage failures
      }

      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/life-planner/dashboard');
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login.');
      setIsLoading(false);
    }
  }, [email, password, savePassword, router]);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-yoga-50 via-white to-yoga-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-yoga-100">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-swar-text mb-2">Welcome Back</h1>
              <p className="text-swar-text-secondary">Access your Life Planner dashboard</p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-swar-primary-light border border-green-200 rounded-lg flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-swar-primary flex-shrink-0" />
                <span className="text-swar-primary font-medium">Login successful! Redirecting...</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-swar-text mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-swar-text mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-swar-text-secondary hover:text-swar-text-secondary"
                    tabIndex={-1}
                  >
                    {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Save Password Checkbox */}
              <div className="flex items-center space-x-3 p-3 bg-yoga-50 rounded-lg border border-yoga-100">
                <input
                  type="checkbox"
                  id="savePassword"
                  checked={savePassword}
                  onChange={handleSavePassword}
                  className="w-4 h-4 text-swar-primary rounded focus:ring-2 focus:ring-yoga-500"
                  disabled={isLoading}
                />
                <label htmlFor="savePassword" className="text-sm text-swar-text cursor-pointer flex-1">
                  Save password on this device
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full bg-gradient-to-r from-yoga-500 to-yoga-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-yoga-600 hover:to-yoga-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Enter Dashboard →'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-swar-border"></div>
              <span className="px-3 text-sm text-swar-text-secondary">or</span>
              <div className="flex-1 border-t border-swar-border"></div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center space-y-3">
              <p className="text-swar-text-secondary text-sm">
                Don't have an account?{' '}
                <a href="/signup" className="text-swar-primary hover:text-swar-accent font-semibold">
                  Sign up here
                </a>
              </p>
              <p className="text-swar-text-secondary text-sm">
                <a href="/signin" className="text-swar-primary hover:text-swar-accent font-semibold">
                  Continue as guest →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
