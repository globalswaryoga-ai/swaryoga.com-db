'use client';

import React, { useState, useCallback, useRef } from 'react';
import { X, AlertCircle, CheckCircle, Eye, EyeOff, UserCheck } from 'lucide-react';

interface EnquiryFormModalProps {
  workshopId: string;
  workshopName: string;
  month: string;
  mode: string;
  language: string;
  priceInr?: number;
  payNowHref?: string;
  payNowHref3Month?: string; // Additional link for Master Class
  onClose: () => void;
}

export default function EnquiryFormModal({
  workshopId,
  workshopName,
  month,
  mode,
  language,
  priceInr,
  payNowHref,
  payNowHref3Month,
  onClose,
}: EnquiryFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    gender: '',
    city: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [leadNumber, setLeadNumber] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // User existence check state
  const [userExists, setUserExists] = useState(false);
  const [existingUserInfo, setExistingUserInfo] = useState<{ profileId: string; name: string; maskedEmail: string } | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  /** Debounced check if user exists by email or phone */
  const checkUserExists = useCallback(async (email: string, phone: string) => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

    // Need at least a valid email or 10+ digit phone
    const hasValidEmail = email.trim().length > 3 && email.includes('@');
    const hasValidPhone = phone.replace(/\D/g, '').length >= 10;

    if (!hasValidEmail && !hasValidPhone) {
      setUserExists(false);
      setExistingUserInfo(null);
      return;
    }

    checkTimerRef.current = setTimeout(async () => {
      setCheckingUser(true);
      try {
        const res = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: hasValidEmail ? email.trim() : undefined,
            phone: hasValidPhone ? phone.trim() : undefined,
          }),
        });
        const data = await res.json();
        const result = data?.data || data;

        if (result?.exists) {
          setUserExists(true);
          setExistingUserInfo({
            profileId: result.profileId || '',
            name: result.name || '',
            maskedEmail: result.maskedEmail || '',
          });
        } else {
          setUserExists(false);
          setExistingUserInfo(null);
        }
      } catch {
        // Silently fail — user can still submit
      } finally {
        setCheckingUser(false);
      }
    }, 600); // 600ms debounce
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Trigger user check when email or mobile changes
      if (name === 'email' || name === 'mobile') {
        checkUserExists(
          name === 'email' ? value : prev.email,
          name === 'mobile' ? value : prev.mobile
        );
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setLeadNumber(null);

    // Validation
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      setLoading(false);
      return;
    }

    if (!formData.mobile.trim() || formData.mobile.length < 10) {
      setMessage({ type: 'error', text: 'Valid mobile number (10+ digits) is required' });
      setLoading(false);
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setMessage({ type: 'error', text: 'Valid email is required' });
      setLoading(false);
      return;
    }

    if (!formData.gender) {
      setMessage({ type: 'error', text: 'Please select gender' });
      setLoading(false);
      return;
    }

    if (!formData.city.trim()) {
      setMessage({ type: 'error', text: 'City is required' });
      setLoading(false);
      return;
    }

    // Password validation for new users only
    if (!userExists) {
      if (!formData.password.trim()) {
        setMessage({ type: 'error', text: 'Password is required for new registration' });
        setLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/workshop-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          workshopName,
          month,
          mode,
          language,
          priceInr,
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          gender: formData.gender,
          city: formData.city,
          // Only send password for new users  
          ...(!userExists && formData.password ? { password: formData.password } : {}),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const result = data?.data || data;
        const ln = result?.leadNumber;
        if (ln) setLeadNumber(String(ln));

        if (result?.userCreated) {
          setMessage({
            type: 'success',
            text: `Account created! Your credentials have been sent to your WhatsApp & Email. Lead ID: ${ln || ''}`,
          });
        } else if (result?.userExists || result?.updated) {
          setMessage({
            type: 'success',
            text: `Form submitted successfully! Lead ID: ${ln || ''}`,
          });
        } else {
          setMessage({ type: 'success', text: 'Thank you! Your form is submitted successfully.' });
        }

        setFormData({
          name: '',
          mobile: '',
          email: '',
          gender: '',
          city: '',
          password: '',
          confirmPassword: '',
        });
        setUserExists(false);
        setExistingUserInfo(null);

        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit enquiry' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error submitting enquiry. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-700 text-white p-6 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold">Registration Form</h2>
          <button
            onClick={onClose}
            className="hover:bg-green-600 p-1 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Workshop:</strong> {workshopName}
            </p>
            <p className="text-sm text-gray-700">
              <strong>For:</strong> {month} • {mode} • {language}
            </p>
            {typeof priceInr === 'number' && priceInr > 0 && (
              <p className="text-sm text-gray-700">
                <strong>Fee:</strong> ₹{Number(priceInr).toLocaleString('en-IN')}
              </p>
            )}
            {leadNumber && (
              <p className="text-sm text-gray-700 mt-1">
                <strong>Lead ID:</strong> <span className="font-black">{leadNumber}</span>
              </p>
            )}
          </div>

          {/* Already registered popup */}
          {userExists && existingUserInfo && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck size={20} className="text-green-600" />
                <span className="font-bold text-green-800">You&apos;re already registered!</span>
              </div>
              <p className="text-sm text-green-700">
                No need to create a new password. Your existing account will be linked.
              </p>
              {existingUserInfo.profileId && (
                <p className="text-xs text-green-600 mt-1">
                  Profile ID: <strong>{existingUserInfo.profileId}</strong>
                  {existingUserInfo.maskedEmail && ` • ${existingUserInfo.maskedEmail}`}
                </p>
              )}
              <p className="text-xs text-green-600 mt-1">
                You can login at <a href="/signin" className="underline font-semibold">swaryoga.com/signin</a> with your existing credentials.
              </p>
            </div>
          )}

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg flex gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {checkingUser && (
                <p className="text-xs text-gray-400 mt-1">Checking account...</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter your city"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Password fields — only shown for NEW users */}
            {!userExists && (
              <>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-3">
                    Create a password to access your Swar Yoga account, Life Planner, and workshop materials.
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                    Create Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 6 characters"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : userExists ? 'Submit Enquiry' : 'Register & Create Account'}
            </button>

            {payNowHref && (
              <div className="space-y-3 pt-2">
                <a
                  href={payNowHref}
                  style={{ 
                    width: '100%', 
                    backgroundColor: '#1CA953', 
                    textAlign: 'center', 
                    fontWeight: 800, 
                    padding: '11px 0px', 
                    color: 'white', 
                    fontSize: '14px', 
                    display: 'inline-block', 
                    textDecoration: 'none', 
                    borderRadius: '3.229px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {workshopId === 'master-swar-yoga' ? 'Pay Now (1 Month \u20b91500)' : 'Pay Now (\u20b9145)'}
                </a>
                
                {payNowHref3Month && (
                  <a
                    href={payNowHref3Month}
                    style={{ 
                      width: '100%', 
                      backgroundColor: '#1B70E1', 
                      textAlign: 'center', 
                      fontWeight: 800, 
                      padding: '11px 0px', 
                      color: 'white', 
                      fontSize: '14px', 
                      display: 'inline-block', 
                      textDecoration: 'none', 
                      borderRadius: '3.229px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Pay Now (3 Months \u20b93600)
                  </a>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
