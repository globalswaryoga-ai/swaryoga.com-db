'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Authenticate with API endpoint
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setSubmitStatus('success');
        
        // Store admin token in localStorage (support both key formats used across the repo)
        const resolvedUserId = data.user?.userId || formData.username;
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', resolvedUserId);
        localStorage.setItem('admin_token', data.token);
        // Prefer storing the full user payload for permission-based routing.
        // Keep backward compatibility by ensuring at least { userId } exists.
        localStorage.setItem(
          'admin_user',
          JSON.stringify({
            ...(data.user && typeof data.user === 'object' ? data.user : {}),
            userId: resolvedUserId,
          })
        );

        // Always send admins to the hub first; the hub will show cards based on permissions.
        setTimeout(() => {
          router.push('/admin');
        }, 1000);
      } else {
        setErrors({ 
          general: data.error || 'Invalid username or password. Please try again.' 
        });
        setSubmitStatus('error');
      }
    } catch (_err) {
      setErrors({ general: 'An error occurred. Please try again.' });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-swar-text mb-2">Admin Login</h1>
            <p className="text-swar-text-secondary">Swar Yoga Admin Panel</p>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-swar-primary-light border border-green-200 rounded-lg flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-swar-primary" />
              <span className="text-swar-primary font-medium">Login successful! Redirecting...</span>
            </div>
          )}

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 text-sm">{errors.general}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-swar-text mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.username ? 'border-red-400 bg-red-50' : 'border-swar-border'
                }`}
                placeholder="Enter username"
                autoComplete="username"
              />
              {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
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
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.password ? 'border-red-400 bg-red-50' : 'border-swar-border'
                  }`}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-swar-text-secondary hover:text-swar-text-secondary"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-swar-primary to-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Logging In...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Admin Login</span>
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium mb-2">🔒 Security Notice</p>
            <p className="text-xs text-swar-text">Admin credentials are confidential. Contact your administrator if you need access.</p>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <a href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              ← Back to website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
