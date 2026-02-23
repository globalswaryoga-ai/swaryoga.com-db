'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { COMMUNITY_DESIGNS } from '@/lib/communityColorSystem';
import { SORTED_COUNTRY_NAMES, getPhoneCode, getCountryFlag } from '@/lib/countryPhoneCodes';

export default function JoinCommunityPage() {
  const params = useParams();
  const communityId = params.communityId as string;

  // Find community design info
  const communityDesign = COMMUNITY_DESIGNS.find(c => c.id === communityId);
  const communityName = communityDesign?.name || communityId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    country: 'India',
  });
  const [loading, setLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    if (!formData.country) {
      setError('Please select your country');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          mobile: formData.mobile,
          country: formData.country,
          countryCode: getPhoneCode(formData.country),
          communityId,
          communityName,
          viaInviteLink: true,
        }),
      });

      const result = await response.json();

      if (!response.ok && response.status !== 200) {
        setError(result.error || 'Failed to join community');
        return;
      }

      // Store user data locally
      if (result?.data?.token) {
        localStorage.setItem('token', result.data.token);
      }
      localStorage.setItem('community_user', JSON.stringify({
        name: formData.name.trim(),
        mobile: formData.mobile,
        userId: result?.data?.userId,
        _id: result?.data?.userId,
      }));

      setSuccessMessage(result.message || 'Successfully registered!');
      setShowThankYou(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!communityId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-semibold text-lg">Invalid community link</p>
          <p className="text-gray-500 mt-2">Please use the link shared with you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4 relative">

      {/* ====== THANK YOU POPUP OVERLAY ====== */}
      {showThankYou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-[scaleIn_0.35s_ease-out]">
            {/* Animated check icon */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">🙏 Thank You!</h2>
            <p className="text-lg text-gray-700 mb-2">
              You have successfully registered for
            </p>
            <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
              {communityName}
            </p>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex items-center gap-3 text-left">
                <span className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg">📧</span>
                <p className="text-sm text-green-800">
                  Soon you will get all updates on your <strong>email & WhatsApp</strong>.
                </p>
              </div>
              {communityId !== 'global' && (
                <div className="flex items-center gap-3 text-left">
                  <span className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-lg">✅</span>
                  <p className="text-sm text-amber-800">
                    Admin will <strong>review and approve</strong> your membership shortly.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 text-left">
                <span className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">🕉️</span>
                <p className="text-sm text-blue-800">
                  Welcome to the <strong>Swar Yoga</strong> family!
                </p>
              </div>
            </div>

            <a
              href="/community"
              className="inline-block w-full py-3.5 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl text-lg"
            >
              Explore Community →
            </a>
          </div>
        </div>
      )}

      {/* ====== JOIN FORM ====== */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${communityDesign?.color?.gradient || 'from-green-600 to-emerald-600'} p-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-inner">
              <span className="text-3xl">🕉️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Join {communityName}</h1>
              <p className="text-sm opacity-90 mt-1">
                {communityDesign?.description || 'Connect with the Swar Yoga community'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              👤 Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 transition-all"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📧 Email Address
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 transition-all"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📱 Phone / WhatsApp Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-600 text-sm font-medium min-w-[80px] justify-center">
                {getCountryFlag(formData.country)} {getPhoneCode(formData.country)}
              </span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="flex-1 px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 transition-all"
                required
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🌍 Country <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="country-options"
              placeholder="Type or select your country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 transition-all"
              required
            />
            <datalist id="country-options">
              {SORTED_COUNTRY_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-lg"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Joining...
              </>
            ) : (
              '🙏 Join Community'
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            By joining, you agree to the community guidelines.
            {communityId !== 'global' && ' Your membership will be reviewed by admin.'}
          </p>
        </form>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
