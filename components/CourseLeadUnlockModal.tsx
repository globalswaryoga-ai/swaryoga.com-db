'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle2, Loader2, Play, User, Mail, Phone, MapPin, Globe, Sparkles } from 'lucide-react';

interface CourseLeadUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courseTitle?: string;
  courseId?: string;
  courseSlug?: string;
  targetVideoTitle?: string;
}

export default function CourseLeadUnlockModal({
  isOpen,
  onClose,
  onSuccess,
  courseTitle = 'Swar Yoga Course',
  courseId,
  courseSlug,
  targetVideoTitle,
}: CourseLeadUnlockModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from localStorage if previously entered
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('swar_lead_user');
        if (cached) {
          const u = JSON.parse(cached);
          if (u.name) setName(u.name);
          if (u.email) setEmail(u.email);
          if (u.phone) setPhone(u.phone);
          if (u.country) setCountry(u.country);
          if (u.state) setState(u.state);
          if (u.city) setCity(u.city);
          if (u.gender) setGender(u.gender);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid WhatsApp mobile number');
      return;
    }
    if (!country.trim()) {
      setError('Please enter your country');
      return;
    }
    if (!state.trim()) {
      setError('Please enter your state');
      return;
    }
    if (!city.trim()) {
      setError('Please enter your city');
      return;
    }

    try {
      setLoading(true);
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('swar_visitor_session') || '' : '';

      const res = await fetch('/api/e-learning/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          country: country.trim(),
          state: state.trim(),
          city: city.trim(),
          gender,
          courseId,
          slug: courseSlug,
          sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit form. Please try again.');
      }

      // Save unlock state
      if (typeof window !== 'undefined') {
        const unlockKey = courseSlug ? `swar_course_unlocked_${courseSlug}` : `swar_course_unlocked_all`;
        localStorage.setItem(unlockKey, 'true');
        if (courseId) {
          localStorage.setItem(`swar_course_unlocked_${courseId}`, 'true');
        }
        localStorage.setItem(
          'swar_lead_user',
          JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            country: country.trim(),
            state: state.trim(),
            city: city.trim(),
            gender,
            unlockedAt: Date.now(),
          })
        );
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 bg-white/25 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
              <Sparkles size={12} /> Free 1-Step Unlock
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
              100% Free
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            Unlock All Course Videos
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            {targetVideoTitle ? (
              <>
                To watch <span className="font-semibold text-white">"{targetVideoTitle}"</span> and the rest of the videos, please share your details.
              </>
            ) : (
              'Video 1 is free to watch! Please fill in your details once to unlock Video 2 through Video 6.'
            )}
          </p>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                WhatsApp Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                We will send course updates and materials on this WhatsApp number.
              </p>
            </div>

            {/* Gender Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Male', 'Female', 'Other'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2 px-3 text-sm font-medium rounded-xl border text-center transition-all ${
                      gender === g
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Location: Country, State, City */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <MapPin size={14} className="text-gray-500" /> Location Details
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Country */}
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Country (e.g. India)"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
                {/* State */}
                <div>
                  <input
                    type="text"
                    required
                    placeholder="State (e.g. Maharashtra)"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
                {/* City */}
                <div>
                  <input
                    type="text"
                    required
                    placeholder="City (e.g. Mumbai)"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Unlocking Videos...
                  </>
                ) : (
                  <>
                    <Play size={18} className="fill-white" /> Unlock & Continue Watching
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-center text-gray-400">
              Your details are safe with Swar Yoga and will never be shared with third parties.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
